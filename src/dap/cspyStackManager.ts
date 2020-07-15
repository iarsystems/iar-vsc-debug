'use strict';

import { ContextRef, ContextType, Symbol } from "./thrift/bindings/shared_types";
import * as ContextManager from "./thrift/bindings/ContextManager";
import { StackFrame, Source, Scope, Handles, Variable } from "vscode-debugadapter";
import { basename } from "path";

/**
 * Desribes a scope, i.e. a name/type (local, static or register) and a frame index (the 'frame level')
 */
class ScopeReference {
    constructor(
        readonly name: "local" | "static" | "registers",
        readonly context: ContextRef,
    ) { }
}

/**
 * Takes care of managing stack contexts and scopes, and presents
 * them in a way that is more easily used for DAP purposes.
 */
export class CSpyStackManager {
    // References to all current stack contexts
    private contextReferences: ContextRef[] = [];

    // Reference ids to all DAP scopes we've created
    private scopeHandles = new Handles<ScopeReference>();

    // TODO: We should get this from the event service, I think, but it doesn't seem to receive any contexts. This works for now.
    private readonly currentInspectionContext = new ContextRef({ core: 0, level: 0, task: 0, type: ContextType.CurrentInspection });

    constructor(private contextManager: ContextManager.Client) {
    }

    async fetchStackFrames(): Promise<StackFrame[]> {
        const contextInfos = await this.contextManager.getStack(this.currentInspectionContext, 0, -1);
        console.log(contextInfos);

        this.contextReferences = contextInfos.map(contextInfo => contextInfo.context);

        return contextInfos.map((contextInfo, i) => {
            if (contextInfo.sourceRanges.length > 0) {
                const filename = contextInfo.sourceRanges[0].filename;
                return new StackFrame(
                    contextInfo.context.level, contextInfo.functionName, new Source(basename(filename), filename), contextInfo.sourceRanges[0].first.line, contextInfo.sourceRanges[0].first.col
                );
            } else {
                return new StackFrame(
                   contextInfo.context.level, contextInfo.functionName // TODO: maybe add a Source that points to memory or disasm window
                );
            }
        });
    }

    async fetchScopes(frameIndex: number): Promise<Scope[]> {
        const scopes = new Array<Scope>();
        const context = this.contextReferences[frameIndex];
        scopes.push(new Scope("Local", this.scopeHandles.create(new ScopeReference("local", context)), false));
        scopes.push(new Scope("Static", this.scopeHandles.create(new ScopeReference("static", context)), false));
        scopes.push(new Scope("Registers", this.scopeHandles.create(new ScopeReference("registers", context)), false));

        return scopes;
    }

    async fetchVariables(scopeReference: number): Promise<Variable[]> {
        const scope = this.scopeHandles.get(scopeReference);

        let requestedVars: Symbol[] = [];
        switch (scope.name) {
            case "local":
                requestedVars = await this.contextManager.getLocals(scope.context);
                break;
            case "static":
                requestedVars = [];
                break;
            case "registers":
                requestedVars = [];
                break;
        }

        return requestedVars.map(variable => {
            return {
                name: variable.name,
                type: "", // technically, we should only provide this if the client has specified that it supports it
                value: "", // (await this._cspyDebugger.service.evalExpression(context, variable.name, [], ExprFormat.kNoCustom, false)).value,
                variablesReference: 0,
            }
        });
    }

    async setVariable(scopeReference: number): Promise<string> {
        // const scope = this.scopeHandles.get(scopeReference);
        return Promise.reject("Not implemented");
    }

}