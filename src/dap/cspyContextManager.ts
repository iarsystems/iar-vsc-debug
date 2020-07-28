'use strict';

import { ContextRef, ContextType, ExprFormat } from "./thrift/bindings/shared_types";
import * as ContextManager from "./thrift/bindings/ContextManager";
import * as Debugger from "./thrift/bindings/Debugger";
import { StackFrame, Source, Scope, Handles, Variable } from "vscode-debugadapter";
import { basename } from "path";
import { ExprValue, CONTEXT_MANAGER_SERVICE, DEBUGGER_SERVICE } from "./thrift/bindings/cspy_types";
import { Disposable } from "./disposable";
import { ThriftServiceManager } from "./thrift/thriftservicemanager";
import { ThriftClient } from "./thrift/thriftclient";
import { WindowNames } from "./listWindowConstants";
import { ListWindowVariablesProvider, VariablesProvider } from "./variablesProvider";
import { ListWindowRow } from "./listWindowClient";

/**
 * Describes a scope, i.e. a C-SPY context used to access the scope,
 * and a provider giving the variables in that scope.
 */
class ScopeReference {
    constructor(
        readonly provider: VariablesProvider,
        readonly context: ContextRef,
    ) { }
}

/**
 * Describes an expandable variable
 */
class VariableReference {
    constructor(
        readonly source: VariablesProvider,
        readonly sourceReference: number,
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
    static async instantiate(serviceMgr: ThriftServiceManager): Promise<CSpyContextManager> {
        return new CSpyContextManager(
            await serviceMgr.findService(CONTEXT_MANAGER_SERVICE, ContextManager.Client),
            await serviceMgr.findService(DEBUGGER_SERVICE, Debugger.Client),
            await ListWindowVariablesProvider.instantiate(serviceMgr, WindowNames.LOCALS, RowToVariableConverters.locals),
            await ListWindowVariablesProvider.instantiate(serviceMgr, WindowNames.STATICS, RowToVariableConverters.statics),
            await ListWindowVariablesProvider.instantiate(serviceMgr, WindowNames.REGISTERS, RowToVariableConverters.registers),
        );
    }

    // References to all current stack contexts
    private contextReferences: ContextRef[] = [];

    // Reference ids to all DAP scopes we've created, and to all expandable variables
    // We send these to the client when creating scopes or expandable vars, and the client
    // can then use them to e.g. request all variables for a scope or request that we expand
    // and expandable variable.
    private scopeAndVariableHandles = new Handles<ScopeReference | VariableReference>();

    // TODO: We should get this from the event service, I think, but it doesn't seem to receive any contexts. This works for now.
    private readonly currentInspectionContext = new ContextRef({ core: 0, level: 0, task: 0, type: ContextType.CurrentInspection });

    private constructor(private contextManager: ThriftClient<ContextManager.Client>,
                        private dbgr: ThriftClient<Debugger.Client>,
                        private localsProvider: ListWindowVariablesProvider,
                        private staticsProvider: ListWindowVariablesProvider,
                        private registersProvider: ListWindowVariablesProvider) {
    }

    /**
     * Fetches *all* available stack frames.
     */
    async fetchStackFrames(): Promise<StackFrame[]> {
        const contextInfos = await this.contextManager.service.getStack(this.currentInspectionContext, 0, -1);

        this.contextReferences = contextInfos.map(contextInfo => contextInfo.context);

        // this assumes the contexts we get from getStack are sorted by frame level and in ascending order
        return contextInfos.map((contextInfo, i) => {
            if (contextInfo.sourceRanges.length > 0) {
                const filename = contextInfo.sourceRanges[0].filename;
                return new StackFrame(
                    i, contextInfo.functionName, new Source(basename(filename), filename), contextInfo.sourceRanges[0].first.line, contextInfo.sourceRanges[0].first.col
                );
            } else {
                return new StackFrame(
                   i, contextInfo.functionName // TODO: maybe add a Source that points to memory or disasm window
                );
            }
        });
    }

    /**
     * Fetches the scopes available for a stack frame.
     * For now, these are the same three for all frames (local, static and registers).
     * Each scope is given a reference number (or 'handle'), that is used to specify the scope when
     * e.g. fetching variables.
     */
    async fetchScopes(frameIndex: number): Promise<Scope[]> {
        const context = this.contextReferences[frameIndex];

        const scopes = new Array<Scope>();
        scopes.push(new Scope("Local", this.scopeAndVariableHandles.create(new ScopeReference(this.localsProvider, context)), false));
        scopes.push(new Scope("Static", this.scopeAndVariableHandles.create(new ScopeReference(this.staticsProvider, context)), false));
        scopes.push(new Scope("Registers", this.scopeAndVariableHandles.create(new ScopeReference(this.registersProvider, context)), false));

        return scopes;
    }

    /**
     * Fetches all variables from a handle. The handle may either refer to a scope (so we return all variables in that scope),
     * or to an expandable variable (so we return all sub-variables for that variable).
     */
    async fetchVariables(handle: number): Promise<Variable[]> {
        const reference = this.scopeAndVariableHandles.get(handle);
        if (reference instanceof ScopeReference) {
            await this.contextManager.service.setInspectionContext(reference.context);
            const vars = await reference.provider.getVariables();
            return vars.map(v => this.replaceVariableReference(reference.provider, v));
        } else if (reference instanceof VariableReference) {
            const subVars = await reference.source.getSubvariables(reference.sourceReference);
            return subVars.map(v => this.replaceVariableReference(reference.source, v));
        }
        throw new Error("Unknown handle type.");
    }

    /**
     * Sets a variable in the specified scope to the specified value.
     * // TODO: this could use the appropriate cspy window to the set the variable instead of relying on evals
     */
    async setVariable(scopeReference: number, variable: string, value: string): Promise<string> {
        const scope = this.scopeAndVariableHandles.get(scopeReference);
        if (!(scope instanceof ScopeReference)) { throw new Error("Invalid reference: Is not a scope."); }

        const context = scope.context;
        await this.contextManager.service.setInspectionContext(context);
        const exprVal = await this.dbgr.service.evalExpression(context, `${variable}=${value}`, [], ExprFormat.kDefault, true);
        return exprVal.value;
    }

    /**
     * Evaluates some expression at the specified stack frame.
     */
    async evalExpression(frameIndex: number, expression: string): Promise<ExprValue> {
        const context = this.contextReferences[frameIndex];
        await this.contextManager.service.setInspectionContext(context);
        const result = await this.dbgr.service.evalExpression(context, expression, [], ExprFormat.kDefault, true);
        return result;
    }

    async dispose() {
        await this.localsProvider.dispose();
        await this.staticsProvider.dispose();
        await this.registersProvider.dispose();
        this.contextManager.dispose();
        this.dbgr.dispose();
    }

    // Transforms the variableReference value provided by a VariablesProvider
    // into one that we can send to the DAP client, and that won't conflict with other
    // references created by this class (e.g. for scopes). The new reference points to a
    // {@link VariableReference} that lets us later access the original value.
    private replaceVariableReference(source: VariablesProvider, variable: Variable): Variable {
        if (variable.variablesReference > 0) {
            variable.variablesReference = this.scopeAndVariableHandles.create(new VariableReference(source, variable.variablesReference));
            return variable;
        }
        return variable;
    }
}

/**
 * Describes how the columns of these windows are laid out, and how to convert them to variables
 */
namespace RowToVariableConverters {
    export function locals(row: ListWindowRow) {
        return {
            name: row.values[0],
            value: row.values[1],
            type: `${row.values[3]} @ ${row.values[2]}`,
            variablesReference: 0,
        }
    }
    export function statics(row: ListWindowRow) {
        return {
            name: row.values[0],
            value: row.values[1],
            type: `${row.values[3]} @ ${row.values[2]}`,
            variablesReference: 0,
        }
    }
    export function registers(row: ListWindowRow) {
        return {
            name: row.values[0],
            value: row.values[1],
            type: row.values[2],
            variablesReference: 0,
        }
    }
}