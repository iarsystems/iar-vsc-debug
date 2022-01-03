

import { ContextRef, ContextType, ExprFormat } from "./thrift/bindings/shared_types";
import * as ContextManager from "./thrift/bindings/ContextManager";
import * as Debugger from "./thrift/bindings/Debugger";
import { StackFrame, Source, Scope, Handles, Variable } from "vscode-debugadapter";
import { basename } from "path";
import { ExprValue, CONTEXT_MANAGER_SERVICE, DEBUGGER_SERVICE, DkNotifyConstant } from "./thrift/bindings/cspy_types";
import { Disposable } from "./disposable";
import { ThriftServiceManager } from "./thrift/thriftServiceManager";
import { ThriftClient } from "./thrift/thriftClient";
import { WindowNames } from "./listWindowConstants";
import { ListWindowVariablesProvider, VariablesProvider } from "./variablesProvider";
import { ListWindowRow } from "./listWindowClient";
import { DebugProtocol } from "vscode-debugprotocol";
import { DebugEventListenerHandler } from "./debugEventListenerHandler";

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
    static async instantiate(serviceMgr: ThriftServiceManager, cspyEventListener: DebugEventListenerHandler): Promise<CSpyContextManager> {
        const onProviderUnavailable = (reason: unknown) => {
            throw reason;
        };
        return new CSpyContextManager(
            await serviceMgr.findService(CONTEXT_MANAGER_SERVICE, ContextManager.Client),
            await serviceMgr.findService(DEBUGGER_SERVICE, Debugger.Client),
            await ListWindowVariablesProvider.instantiate(serviceMgr, WindowNames.LOCALS, RowToVariableConverters.locals).catch(onProviderUnavailable),
            await ListWindowVariablesProvider.instantiate(serviceMgr, WindowNames.STATICS, RowToVariableConverters.statics).catch(onProviderUnavailable),
            await ListWindowVariablesProvider.instantiate(serviceMgr, WindowNames.REGISTERS, RowToVariableConverters.registers).catch(onProviderUnavailable),
            cspyEventListener,
        );
    }

    // References to all current stack contexts
    private contextReferences: ContextRef[] = [];
    // Keeps track of the context currently set in cspy, so we know when we change it.
    private currentInspectionContext: ContextRef | undefined;

    // Reference ids to all DAP scopes we've created, and to all expandable variables
    // We send these to the client when creating scopes or expandable vars, and the client
    // can then use them to e.g. request all variables for a scope or request that we expand
    // and expandable variable.
    private readonly scopeAndVariableHandles = new Handles<ScopeReference | VariableReference>();

    // The base context represents the top of the stack frame. We don't worry about multicore/rtos for now, so we can use
    // this context for most operations.
    private readonly baseContext = new ContextRef({ core: 0, level: 0, task: 0, type: ContextType.CurrentBase });

    private constructor(private readonly contextManager: ThriftClient<ContextManager.Client>,
                        private readonly dbgr: ThriftClient<Debugger.Client>,
                        private readonly localsProvider: ListWindowVariablesProvider | undefined,
                        private readonly staticsProvider: ListWindowVariablesProvider | undefined,
                        private readonly registersProvider: ListWindowVariablesProvider | undefined,
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
            const varProvider = reference.provider;
            if (!varProvider) {
                throw new Error("Backend is not available for this scope.");
            }
            await this.setInspectionContext(reference.context);
            const vars = await varProvider.getVariables();
            return vars.map(v => this.replaceVariableReference(varProvider, v));

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
        if (!(scope instanceof ScopeReference)) {
            throw new Error("Invalid reference: Is not a scope.");
        }

        const context = scope.context;
        await this.setInspectionContext(context);
        const exprVal = await this.dbgr.service.evalExpression(context, `${variable}=${value}`, [], ExprFormat.kDefault, true);
        return exprVal.value;
    }

    /**
     * Evaluates some expression at the specified stack frame.
     */
    async evalExpression(frameIndex: number | undefined, expression: string): Promise<ExprValue> {
        const context = frameIndex === undefined ? this.baseContext : this.contextReferences[frameIndex];
        if (!context) {
            throw new Error(`Frame index ${frameIndex} is out of bounds`);
        }
        await this.setInspectionContext(context);
        const result = await this.dbgr.service.evalExpression(context, expression, [], ExprFormat.kDefault, true);
        return result;
    }

    async dispose() {
        await this.localsProvider?.dispose();
        await this.staticsProvider?.dispose();
        await this.registersProvider?.dispose();
        this.contextManager.dispose();
        this.dbgr.dispose();
    }

    private async setInspectionContext(context: ContextRef) {
        if (context !== this.currentInspectionContext) {
            // Tell the variable windows to wait for an update before providing any variables
            this.localsProvider?.notifyUpdateImminent();
            this.staticsProvider?.notifyUpdateImminent();
            this.registersProvider?.notifyUpdateImminent();
            this.currentInspectionContext = context;
        }
        await this.contextManager.service.setInspectionContext(context);
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
    export function locals(row: ListWindowRow): DebugProtocol.Variable {
        if (row.values[0] === undefined || row.values[1] === undefined || row.values[3] === undefined) {
            throw new Error("Not enough data in row to parse variable");
        }
        return {
            name: row.values[0],
            value: row.values[1],
            type: row.values[3] ? `${row.values[3]} @ ${row.values[2]}` : "",
            variablesReference: 0,
        };
    }
    export function statics(row: ListWindowRow): DebugProtocol.Variable {
        if (row.values[0] === undefined || row.values[1] === undefined || row.values[3] === undefined) {
            throw new Error("Not enough data in row to parse variable");
        }
        return {
            // TODO: Do we actually want to remove the second half?
            name: row.values[0].split(" ")[0] ?? row.values[0],
            value: row.values[1],
            type: `${row.values[3]} @ ${row.values[2]}`,
            variablesReference: 0,
        };
    }
    export function registers(row: ListWindowRow): DebugProtocol.Variable {
        if (row.values[0] === undefined || row.values[1] === undefined || row.values[2] === undefined) {
            throw new Error("Not enough data in row to parse variable");
        }
        return {
            name: row.values[0],
            value: row.values[1],
            type: row.values[2],
            variablesReference: 0,
        };
    }
}
