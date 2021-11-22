import * as vscode from "vscode";

/**
 * The VSCode api has no way of getting all running sessions, only the 'active' one.
 * This class listens for session start/stop events and keeps a record of all running sessions.
 */
export class DebugSessionTracker {
    private readonly sessions: vscode.DebugSession[] = [];

    constructor(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.debug.onDidStartDebugSession(session => {
            console.log(session);
            if (session.type === "cspy") {
                this.sessions.push(session);
            }
        }));
        context.subscriptions.push(vscode.debug.onDidTerminateDebugSession(session => {
            console.log(session);

            if (this.sessions.includes(session)) {
                this.sessions.splice(this.sessions.indexOf(session), 1);
            }
        }));
        // If we were initialized after a session was starting, we won't see it in onDidStartDebugSession
        if (vscode.debug.activeDebugSession && vscode.debug.activeDebugSession.type === "cspy") {
            this.sessions.push(vscode.debug.activeDebugSession);
        }
    }

    get runningSessions(): vscode.DebugSession[] {
        return this.sessions;
    }
}