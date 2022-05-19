/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


import { ContextRef, ContextType, ExprFormat } from "iar-vsc-common/thrift/bindings/shared_types";
import * as ContextManager from "iar-vsc-common/thrift/bindings/ContextManager";
import * as Debugger from "iar-vsc-common/thrift/bindings/Debugger";
import { StackFrame, Source, Scope, Handles, Variable } from "@vscode/debugadapter";
import { basename } from "path";
import { CONTEXT_MANAGER_SERVICE, DEBUGGER_SERVICE, DkNotifyConstant, ExprValue } from "iar-vsc-common/thrift/bindings/cspy_types";
import { Disposable } from "../disposable";
import { ThriftServiceManager } from "../thrift/thriftServiceManager";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { WindowNames } from "../listWindowConstants";
import { ListWindowVariablesProvider, VariablesProvider } from "./variablesProvider";
import { DebugEventListenerHandler } from "../debugEventListenerHandler";
import { VariablesUtils } from "./variablesUtils";
import { DebugProtocol } from "@vscode/debugprotocol";
import { RegistersVariablesProvider } from "./registersVariablesProvider";
import { RegisterInformationGenerator } from "../registerInformationGenerator";

/**
 * Describes a scope, i.e. a C-SPY context used to access the scope,
 * and a provider giving the variables in that scope.
 */
class ScopeReference {
    constructor(
        readonly provider: VariablesProvider | undefined,
        readonly context: ContextRef,
    ) { }
}

/**
 * Describes an expandable variable
 */
class VariableReference {
    constructor(
        readonly provider: VariablesProvider,
        readonly context: ContextRef,
        readonly variableReference: number,
    ) { }
}

/**
 * Describes an expandable eval expression result (e.g a watch entry)
 */
class EvalExpressionReference {
    constructor(
        readonly rootExpression: string,
        readonly subExpressions: number,
        readonly subExprIndex: number[],
        readonly parentExpressions: Array<{ exprName: string, val: ExprValue }>,
        readonly context: ContextRef,
    ) { }
}


/**
 * Takes care of managing stack contexts, and allows to perform operations
 * on/in a context (e.g. fetching or setting variables, evaluating expressions)
 */
export class CSpyContextManager implements Disposable {

    /**
     * Creates a new context manager using services from the given service manager.
     */
    static async instantiate(serviceMgr: ThriftServiceManager, cspyEventListener: DebugEventListenerHandler, regInfoGen: RegisterInformationGenerator): Promise<CSpyContextManager> {
        const onProviderUnavailable = (reason: unknown) => {
            throw reason;
        };
        return new CSpyContextManager(
            await serviceMgr.findService(CONTEXT_MANAGER_SERVICE, ContextManager.Client),
            await serviceMgr.findService(DEBUGGER_SERVICE, Debugger.Client),
            await ListWindowVariablesProvider.instantiate(serviceMgr, WindowNames.LOCALS, 0, 1, 3, 2).catch(onProviderUnavailable),
            await ListWindowVariablesProvider.instantiate(serviceMgr, WindowNames.STATICS, 0, 1, 3, 2).catch(onProviderUnavailable),
            // Registers need a special implementation to handle all the register groups
            await RegistersVariablesProvider.instantiate(serviceMgr, regInfoGen).catch(onProviderUnavailable),
            cspyEventListener,
        );
    }

    // References to all current stack contexts
    private contextReferences: ContextRef[] = [];
    // Keeps track of the context currently set in cspy, so we know when we change it.
    private currentInspectionContext: ContextRef | undefined;

    // Reference ids to all DAP scopes we've created, and to all expandable variables/expressions
    // We send these to the client when creating scopes or expandable vars, and the client
    // can then use them to e.g. request all variables for a scope or request that we expand
    // and expandable variable.
    private readonly scopeAndVariableHandles = new Handles<ScopeReference | VariableReference | EvalExpressionReference>();

    // The base context represents the top of the stack frame. We don't worry about multicore/rtos for now, so we can use
    // this context for most operations.
    private readonly baseContext = new ContextRef({ core: 0, level: 0, task: 0, type: ContextType.CurrentBase });

    private constructor(private readonly contextManager: ThriftClient<ContextManager.Client>,
                        private readonly dbgr: ThriftClient<Debugger.Client>,
                        private readonly localsProvider: ListWindowVariablesProvider | undefined,
                        private readonly staticsProvider: ListWindowVariablesProvider | undefined,
                        private readonly registersProvider: RegistersVariablesProvider | undefined,
                        cspyEventListener: DebugEventListenerHandler) {
        cspyEventListener.observeDebugEvents(DkNotifyConstant.kDkTargetStarted, () => {
            this.currentInspectionContext = undefined;
        });
    }

    /**
     * Fetches *all* available stack frames.
     */
    async fetchStackFrames(): Promise<StackFrame[]> {
        const contextInfos = await this.contextManager.service.getStack(this.baseContext, 0, -1);

        this.contextReferences = contextInfos.map(contextInfo => contextInfo.context);

        // this assumes the contexts we get from getStack are sorted by frame level and in ascending order
        return contextInfos.map((contextInfo, i) => {
            let frame: StackFrame;
            if (contextInfo.sourceRanges[0] !== undefined) {
                const filename = contextInfo.sourceRanges[0].filename;
                frame = new StackFrame(
                    i, contextInfo.functionName, new Source(basename(filename), filename), contextInfo.sourceRanges[0].first.line, contextInfo.sourceRanges[0].first.col
                );
            } else {
                frame = new StackFrame(
                    i, contextInfo.functionName
                );
            }
            // This string may later be passed with a disassemble request for this frame.
            frame.instructionPointerReference = "0x" + contextInfo.execLocation.address.toOctetString();
            return frame;
        });
    }

    /**
     * Fetches the scopes available for a stack frame.
     * For now, these are the same three for all frames (local, static and registers).
     * Each scope is given a reference number (or 'handle'), that is used to specify the scope when
     * e.g. fetching variables.
     */
    fetchScopes(frameIndex: number): Scope[] {
        const context = this.contextReferences[frameIndex];
        if (!context) {
            throw new Error(`Frame index ${frameIndex} is out of bounds`);
        }

        const scopes = new Array<Scope>();
        scopes.push(new Scope("Local", this.scopeAndVariableHandles.create(new ScopeReference(this.localsProvider, context)), false));
        scopes.push(new Scope("Static", this.scopeAndVariableHandles.create(new ScopeReference(this.staticsProvider, context)), false));
        scopes.push(new Scope("CPU Registers", this.scopeAndVariableHandles.create(new ScopeReference(this.registersProvider, context)), false));

        return scopes;
    }

    /**
     * Fetches all variables from a handle. The handle may either refer to a scope (so we return all variables in that scope),
     * or to an expandable variable (so we return all sub-variables for that variable).
     */
    async fetchVariables(handle: number): Promise<Variable[]> {
        const reference = this.scopeAndVariableHandles.get(handle);
        await this.setInspectionContext(reference.context);

        if (reference instanceof ScopeReference) {
            const varProvider = reference.provider;
            if (!varProvider) {
                throw new Error("Backend is not available for this scope.");
            }
            const vars = await varProvider.getVariables();
            return vars.map(v => this.replaceVariableReference(varProvider, v, reference.context));

        } else if (reference instanceof VariableReference) {
            const subVars = await reference.provider.getSubvariables(reference.variableReference);
            return subVars.map(v => this.replaceVariableReference(reference.provider, v, reference.context));
        } else {
            // Fetch subexpression labels and eval each subexpression to get a new eval expression
            const subExprNames = await this.dbgr.service.getSubExpressionLabels(reference.context, reference.rootExpression, reference.subExprIndex, 0, reference.subExpressions, false);
            return Promise.all(subExprNames.map(async(exprName, i) => {
                // Get the i-th subexpression of the expression this reference points to
                const subExprIndices = reference.subExprIndex.concat([i]);
                const expr = await this.dbgr.service.evalExpression(reference.context, reference.rootExpression, subExprIndices, ExprFormat.kDefault, true);
                // subexpressions should be expandable themselves if they have subexpressions
                let variablesReference = 0;
                if (expr.subExprCount > 0) {
                    variablesReference = this.scopeAndVariableHandles.create({
                        context: reference.context,
                        rootExpression: reference.rootExpression,
                        subExpressions: expr.subExprCount,
                        subExprIndex: subExprIndices,
                        parentExpressions: reference.parentExpressions.concat([{exprName: exprName, val: expr}]),
                    });
                }
                return VariablesUtils.createVariableFromExpression(exprName, expr, variablesReference, reference.parentExpressions);
            }));
        }
        throw new Error("Unknown handle type.");
    }

    /**
     * Sets a variable in the specified scope to the specified value.
     * Returns the updated value, and the memory address of the changed variable (if any)
     */
    async setVariable(scopeReference: number, variable: string, value: string): Promise<{newValue: string, changedAddress?: string}> {
        const reference = this.scopeAndVariableHandles.get(scopeReference);
        await this.setInspectionContext(reference.context);

        if (reference instanceof ScopeReference) {
            if (!reference.provider) {
                throw new Error("Backend is not available for this scope.");
            }
            return reference.provider.setVariable(variable, undefined, value);
        } else if (reference instanceof VariableReference) {
            return reference.provider.setVariable(variable, reference.variableReference, value);
        } else {
            const subExprNames = await this.dbgr.service.getSubExpressionLabels(reference.context, reference.rootExpression, reference.subExprIndex, 0, reference.subExpressions - 1, false);
            for (let i = 0; i < reference.subExpressions; i++) {
                if (variable === subExprNames[i]) {
                    const expr = await this.dbgr.service.evalExpression(reference.context, value, [], ExprFormat.kDefault, true);
                    this.dbgr.service.assignExpression(reference.context, reference.rootExpression, reference.subExprIndex.concat([i]), expr);
                    return { newValue: value, changedAddress: expr.hasLocation ? "0x" + expr.location.address.toOctetString() : undefined };
                }
            }
            throw new Error("No such variable found");
        }
    }

    /**
     * Evaluates some expression at the specified stack frame.
     */
    async evalExpression(frameIndex: number | undefined, expression: string): Promise<DebugProtocol.Variable> {
        const context = frameIndex === undefined ? this.baseContext : this.contextReferences[frameIndex];
        if (!context) {
            throw new Error(`Frame index ${frameIndex} is out of bounds`);
        }
        await this.setInspectionContext(context);
        const result = await this.dbgr.service.evalExpression(context, expression, [], ExprFormat.kDefault, true);
        let variablesReference = 0;
        if (result.subExprCount > 0) {
            variablesReference = this.scopeAndVariableHandles.create({
                context: context,
                rootExpression: expression,
                subExpressions: result.subExprCount,
                subExprIndex: [],
                parentExpressions: [{exprName: expression, val: result}],
            });
        }
        return VariablesUtils.createVariableFromExpression(expression, result, variablesReference, []);
    }

    async dispose() {
        await this.localsProvider?.dispose();
        await this.staticsProvider?.dispose();
        await this.registersProvider?.dispose();
        this.contextManager.close();
        this.dbgr.close();
    }

    private async setInspectionContext(context: ContextRef) {
        if (context !== this.currentInspectionContext) {
            // Tell the variable windows to wait for an update before providing any variables
            this.localsProvider?.notifyUpdateImminent();
            this.staticsProvider?.notifyUpdateImminent();
            this.registersProvider?.notifyUpdateImminent();
            this.currentInspectionContext = context;
            await this.contextManager.service.setInspectionContext(context);
        }
    }

    // Transforms the variableReference value provided by a VariablesProvider
    // into one that we can send to the DAP client, and that won't conflict with other
    // references created by this class (e.g. for scopes). The new reference points to a
    // {@link VariableReference} that lets us later access the original value.
    private replaceVariableReference(source: VariablesProvider, variable: Variable, context: ContextRef): Variable {
        if (variable.variablesReference > 0) {
            variable.variablesReference = this.scopeAndVariableHandles.create(new VariableReference(source, context, variable.variablesReference));
            return variable;
        }
        return variable;
    }
}
