/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


import { ContextRef, ContextType, ExprFormat } from "iar-vsc-common/thrift/bindings/shared_types";
import * as ContextManager from "iar-vsc-common/thrift/bindings/ContextManager";
import * as Debugger from "iar-vsc-common/thrift/bindings/Debugger";
import { StackFrame, Source, Scope, Handles, Variable, logger } from "@vscode/debugadapter";
import { basename } from "path";
import { CONTEXT_MANAGER_SERVICE, DEBUGGER_SERVICE, ExprValue } from "iar-vsc-common/thrift/bindings/cspy_types";
import { Disposable } from "../utils";
import { ThriftServiceRegistry } from "iar-vsc-common/thrift/thriftServiceRegistry";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { WindowNames } from "../listWindowConstants";
import { ListWindowVariablesProvider, VariablesProvider } from "./variablesProvider";
import { VariablesUtils } from "./variablesUtils";
import { DebugProtocol } from "@vscode/debugprotocol";
import { RegistersVariablesProvider } from "./registersVariablesProvider";
import { RegisterInformationService } from "../registerInformationService";
import { CSpyCoresService } from "./cspyCoresService";

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
export class CSpyContextService implements Disposable.Disposable {

    /**
     * Creates a new context manager using services from the given service manager.
     * @param serviceRegistry The service manager running the session
     * @param coresService The cores service belonging to the session. This class does not take ownership of the
     *      service, and is not responsible for disposing of it.
     * @param regInfoGen A registry information service to help provide register variables
     */
    static async instantiate(serviceRegistry: ThriftServiceRegistry, coresService: CSpyCoresService, regInfoGen: RegisterInformationService): Promise<CSpyContextService> {
        const onProviderUnavailable = (reason: unknown) => {
            logger.error("Failed to initialize variables provider: " + reason);
            return undefined;
        };
        return new CSpyContextService(
            await serviceRegistry.findService(CONTEXT_MANAGER_SERVICE, ContextManager.Client),
            await serviceRegistry.findService(DEBUGGER_SERVICE, Debugger.Client),
            coresService,
            await ListWindowVariablesProvider.instantiate(serviceRegistry, WindowNames.LOCALS, 0, 1, 3, 2).catch(onProviderUnavailable),
            await ListWindowVariablesProvider.instantiate(serviceRegistry, WindowNames.STATICS, 0, 1, 3, 2).catch(onProviderUnavailable),
            // Registers need a special implementation to handle all the register groups
            await RegistersVariablesProvider.instantiate(serviceRegistry, regInfoGen).catch(onProviderUnavailable),
        );
    }

    // Reference ids to all DAP scopes we've created, and to all expandable variables/expressions
    // We send these to the client when creating scopes or expandable vars, and the client
    // can then use them to e.g. request all variables for a scope or request that we expand
    // and expandable variable.
    private readonly scopeAndVariableHandles = new Handles<ScopeReference | VariableReference | EvalExpressionReference>();
    // Provides unique references to stack contexts (valid until the core starts again)
    private readonly stackFrameHandles = new Handles<ContextRef>();

    private constructor(private readonly contextManager: ThriftClient<ContextManager.Client>,
                        private readonly dbgr: ThriftClient<Debugger.Client>,
                        private readonly coresService: CSpyCoresService,
                        private readonly localsProvider: ListWindowVariablesProvider | undefined,
                        private readonly staticsProvider: ListWindowVariablesProvider | undefined,
                        private readonly registersProvider: RegistersVariablesProvider | undefined) {
    }

    /**
     * Fetches stack frames for the given core.
     * @param core The core for which to fetch stack frames
     * @param startFrame The (0-indexed) index of the first frame to return
     * @param numFrames The number of frames to return (returns all if undefined)
     */
    async fetchStackFrames(core: number, startFrame: number, numFrames?: number): Promise<StackFrame[]> {
        const context = new ContextRef({ core: core, level: 0, task: 0, type: ContextType.Target });
        const contextInfos = await this.contextManager.service.getStack(context, startFrame, numFrames !== undefined ? startFrame + numFrames : -1);

        // this assumes the contexts we get from getStack are sorted by frame level and in ascending order
        return contextInfos.map(contextInfo => {
            let frame: StackFrame;
            const id = this.stackFrameHandles.create(contextInfo.context);
            if (contextInfo.sourceRanges[0] !== undefined) {
                const filename = contextInfo.sourceRanges[0].filename;
                frame = new StackFrame(
                    id, contextInfo.functionName, new Source(basename(filename), filename), contextInfo.sourceRanges[0].first.line, contextInfo.sourceRanges[0].first.col
                );
            } else {
                frame = new StackFrame(
                    id, contextInfo.functionName
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
    fetchScopes(frameId: number): Scope[] {
        const context = this.stackFrameHandles.get(frameId);
        if (!context) {
            throw new Error(`No such frame (id ${frameId})`);
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
    fetchVariables(handle: number): Promise<DebugProtocol.Variable[]> {
        const reference = this.scopeAndVariableHandles.get(handle);
        if (!reference) {
            throw new Error("Invalid scope handle");
        }
        return this.withContext(reference.context, async() => {

            if (reference instanceof ScopeReference) {
                const varProvider = reference.provider;
                if (!varProvider) {
                    // EWARM 8.4 uses the wrong thrift transport for some windows. This is the only reasonable reason why
                    // we would be able to start a session, but not connect to one of the variable windows.
                    throw new Error("Not supported in EWARM v8.40");
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
        });
    }

    /**
     * Sets a variable in the specified scope to the specified value.
     * Returns the updated value, and the memory address of the changed variable (if any)
     */
    setVariable(scopeReference: number, variable: string, value: string): Promise<{newValue: string, changedAddress?: string}> {
        const reference = this.scopeAndVariableHandles.get(scopeReference);
        if (!reference) {
            throw new Error("Invalid scope handle");
        }
        return this.withContext(reference.context, async() => {
            if (reference instanceof ScopeReference) {
                if (!reference.provider) {
                    throw new Error("Backend is not available for this scope.");
                }
                return reference.provider.setVariable(variable, undefined, value);
            } else if (reference instanceof VariableReference) {
                return reference.provider.setVariable(variable, reference.variableReference, value);
            } else {
                const subExprNames = await this.dbgr.service.getSubExpressionLabels(reference.context, reference.rootExpression, reference.subExprIndex, 0, reference.subExpressions, false);
                for (let i = 0; i < reference.subExpressions; i++) {
                    if (variable === subExprNames[i]) {
                        const expr = await this.dbgr.service.evalExpression(reference.context, value, [], ExprFormat.kDefault, true);
                        this.dbgr.service.assignExpression(reference.context, reference.rootExpression, reference.subExprIndex.concat([i]), expr);
                        return { newValue: value, changedAddress: expr.hasLocation ? "0x" + expr.location.address.toOctetString() : undefined };
                    }
                }
                throw new Error("No such variable found");
            }
        });
    }

    /**
     * Evaluates some expression at the specified stack frame.
     */
    evalExpression(frameId: number | undefined, expression: string): Promise<DebugProtocol.Variable> {
        const context = frameId === undefined ? new ContextRef({ core: 0, level: 0, task: 0, type: ContextType.CurrentInspection }) : this.stackFrameHandles.get(frameId);
        if (!context) {
            throw new Error(`No such frame (id ${frameId})`);
        }
        return this.withContext(context, async() => {
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
        });
    }

    /**
     * Sets the value of some l-value expression
     */
    setExpression(frameId: number | undefined, expression: string, value: string): Promise<{ newValue: string, changedAddress?: string }> {
        const context = frameId === undefined ? new ContextRef({ core: 0, level: 0, task: 0, type: ContextType.CurrentInspection }) : this.stackFrameHandles.get(frameId);
        if (!context) {
            throw new Error(`No such frame (id ${frameId})`);
        }
        return this.withContext(context, async() => {
            const expr = await this.dbgr.service.evalExpression(context, value, [], ExprFormat.kDefault, true);
            this.dbgr.service.assignExpression(context, expression, [], expr);
            return { newValue: value, changedAddress: expr.hasLocation ? "0x" + expr.location.address.toOctetString() : undefined };
        });
    }

    async dispose() {
        await this.localsProvider?.dispose();
        await this.staticsProvider?.dispose();
        await this.registersProvider?.dispose();
        this.contextManager.close();
        this.dbgr.close();
    }

    private withContext<T>(context: ContextRef, task: () => Promise<T>): Promise<T> {
        return this.coresService.performOnCore(context.core, async() => {
            // Tell the variable windows to wait for an update before providing any variables
            this.localsProvider?.notifyUpdateImminent();
            this.staticsProvider?.notifyUpdateImminent();
            this.registersProvider?.notifyUpdateImminent();

            await this.contextManager.service.setInspectionContext(context);
            return task();
        });
    }

    // Transforms the variableReference value provided by a VariablesProvider
    // into one that we can send to the DAP client, and that won't conflict with other
    // references created by this class (e.g. for scopes). The new reference points to a
    // {@link VariableReference} that lets us later access the original value.
    private replaceVariableReference(source: VariablesProvider, variable: Variable, context: ContextRef): DebugProtocol.Variable {
        if (variable.variablesReference > 0) {
            variable.variablesReference = this.scopeAndVariableHandles.create(new VariableReference(source, context, variable.variablesReference));
            return variable;
        }
        return variable;
    }
}
