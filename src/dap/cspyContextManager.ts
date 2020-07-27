'use strict';

import { ContextRef, ContextType, Symbol, ExprFormat } from "./thrift/bindings/shared_types";
import * as ContextManager from "./thrift/bindings/ContextManager";
import * as Debugger from "./thrift/bindings/Debugger";
import { StackFrame, Source, Scope, Handles, Variable } from "vscode-debugadapter";
import { basename } from "path";
import { ExprValue, CONTEXT_MANAGER_SERVICE, DEBUGGER_SERVICE } from "./thrift/bindings/cspy_types";
import { Disposable } from "./disposable";
import { ThriftServiceManager } from "./thrift/thriftservicemanager";
import { ThriftClient } from "./thrift/thriftclient";
import { CSpyRegistersManager } from "./cspyRegistersManager";

/**
 * Desribes a scope, i.e. a name/type (local, static or register) and a context.
 */
class ScopeReference {
    constructor(
        readonly name: "local" | "static" | "registers",
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
    static async instantiate(serviceMgr: ThriftServiceManager): Promise<CSpyContextManager> {
        return new CSpyContextManager(
            await serviceMgr.findService(CONTEXT_MANAGER_SERVICE, ContextManager.Client),
            await serviceMgr.findService(DEBUGGER_SERVICE, Debugger.Client),
            await CSpyRegistersManager.instantiate(serviceMgr),
        );
    }

    // References to all current stack contexts
    private contextReferences: ContextRef[] = [];

    // Reference ids to all DAP scopes we've created
    private scopeHandles = new Handles<ScopeReference>();

    // TODO: We should get this from the event service, I think, but it doesn't seem to receive any contexts. This works for now.
    private readonly currentInspectionContext = new ContextRef({ core: 0, level: 0, task: 0, type: ContextType.CurrentInspection });

    private constructor(private contextManager: ThriftClient<ContextManager.Client>,
                        private dbgr: ThriftClient<Debugger.Client>,
                        private registersManager: CSpyRegistersManager) {
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
        scopes.push(new Scope("Local", this.scopeHandles.create(new ScopeReference("local", context)), false));
        scopes.push(new Scope("Static", this.scopeHandles.create(new ScopeReference("static", context)), false));
        scopes.push(new Scope("Registers", this.scopeHandles.create(new ScopeReference("registers", context)), false));

        return scopes;
    }

    /**
     * Fetches all variables in a scope.
     */
    async fetchVariables(scopeReference: number): Promise<Variable[]> {
        const scope = this.scopeHandles.get(scopeReference);

        switch (scope.name) {
            case "local":
                const localSymbols = await this.contextManager.service.getLocals(scope.context); // TODO: also get parameters?
                return localSymbols.map(symbol => {
                    return {
                        // TODO: get value (and ideally type) from cspyserver (use a listwindow service?)
                        name: symbol.name,
                        type: "", // technically, we should only provide this if the client has specified that it supports it
                        value: "", // (await this._cspyDebugger.service.evalExpression(context, variable.name, [], ExprFormat.kNoCustom, false)).value,
                        variablesReference: 0,
                    }
                });
            case "static":
                return [];
            case "registers":
                return this.registersManager.getRegisters();
        }

    }

    /**
     * Sets a variable in the specified scope to the specified value.
     */
    async setVariable(scopeReference: number, variable: string, value: string): Promise<string> {
        const context = this.scopeHandles.get(scopeReference).context;
        await this.contextManager.service.setInspectionContext(context);
        const exprVal = await this.dbgr.service.evalExpression(context, `${variable}=${value}`, [], ExprFormat.kDefault, true);
        if (this.contextReferences.length > 0) {
            await this.contextManager.service.setInspectionContext(this.contextReferences[0]);
        }
        return exprVal.value;
    }

    /**
     * Evaluates some expression at the specified stack frame.
     */
    async evalExpression(frameIndex: number, expression: string): Promise<ExprValue> {
        const context = this.contextReferences[frameIndex];
        await this.contextManager.service.setInspectionContext(context);
        const result = await this.dbgr.service.evalExpression(context, expression, [], ExprFormat.kDefault, true);
        if (this.contextReferences.length > 0) {
            await this.contextManager.service.setInspectionContext(this.contextReferences[0]);
        }
        return result;
    }

    dispose(): void {
        this.contextManager.dispose();
        this.dbgr.dispose();
    }

}