import { Handles, Variable } from "@vscode/debugadapter";
import { Disposable } from "../disposable";
import { ListWindowVariablesProvider, VariablesProvider } from "./variablesProvider";
import { ThriftServiceManager } from "../thrift/thriftServiceManager";
import { ListWindowClient } from "../listWindowClient";
import Int64 = require("node-int64");
import { Mutex } from "async-mutex";
import { WindowNames } from "../listWindowConstants";
import { RegisterInformationGenerator } from "../registerInformationGenerator";
import { logger } from "@vscode/debugadapter/lib/logger";

interface RegisterReference {
    group: GroupReference,
    windowReference: number | undefined,
}
interface GroupReference {
    name: string,
    command: number,
}

/**
 * Provides registers as DAP variables. This uses a ListWindowVariablesProvider, but wraps it in
 * order to handle the register groups, which are accessible through the context menu.
 */
export class RegistersVariablesProvider implements VariablesProvider, Disposable {
    private readonly variableReferences: Handles<RegisterReference> = new Handles();
    private visibleGroup = "";
    private availableGroups: Array<GroupReference> | undefined = undefined;
    private readonly readLock = new Mutex();

    static async instantiate(serviceMgr: ThriftServiceManager, registerInfoGen: RegisterInformationGenerator): Promise<RegistersVariablesProvider> {
        const windowClient = await ListWindowClient.instantiate(serviceMgr, WindowNames.REGISTERS, 0);
        const listWindowProvider = new ListWindowVariablesProvider(windowClient, 0, 1, 2, -1);
        return new RegistersVariablesProvider(listWindowProvider, windowClient, registerInfoGen);
    }

    private constructor(
        private readonly varProvider: ListWindowVariablesProvider,
        private readonly windowClient: ListWindowClient,
        private readonly registerInfoGenerator: RegisterInformationGenerator) { }

    async getVariables(): Promise<Variable[]> {
        if (this.availableGroups === undefined) {
            this.availableGroups = await this.fetchGroups();
        }
        return this.availableGroups.map(group => {
            return {
                name: group.name,
                value: "",
                variablesReference: this.variableReferences.create({ group: group, windowReference: undefined }),
                type: "Register Group",
                presentationHint: "virtual",
            };
        });
    }

    getSubvariables(variableReference: number): Promise<Variable[]> {
        const ref = this.variableReferences.get(variableReference);
        if (!ref) {
            return Promise.resolve([]);
        }
        return this.readLock.runExclusive(async() => {
            if (ref.group.name !== this.visibleGroup) {
                await this.ensureGroupIsVisible(ref.group);
            }
            if (ref.windowReference === undefined) {
                const vars = await this.varProvider.getVariables();
                return vars.map(v => this.replaceVariableReference(v, ref.group));
            }
            const vars = await this.varProvider.getSubvariables(ref.windowReference);
            return vars.map(v => this.replaceVariableReference(v, ref.group));
        });
    }
    setVariable(name: string, variableReference: number | undefined, value: string): Promise<{ newValue: string; changedAddress?: string | undefined; }> {
        if (variableReference === undefined) {
            return Promise.reject(new Error("Tried to set the value of a register group"));
        }
        const ref = this.variableReferences.get(variableReference);
        if (!ref) {
            return Promise.reject(new Error("Could not resolve variable reference"));
        }
        return this.readLock.runExclusive(async() => {
            if (ref.group.name !== this.visibleGroup) {
                await this.ensureGroupIsVisible(ref.group);
            }
            return this.varProvider.setVariable(name, ref.windowReference, value);
        });
    }

    /**
     * Notifies this provider that the backend is about to update its variables.
     * Calls made to {@link getVariables} or {@link getSubvariables} shortly after will wait for
     * the update to be received before returning.
     */
    notifyUpdateImminent() {
        this.varProvider.notifyUpdateImminent();
    }

    dispose(): void {
        // The variables provider should dispose of the ListWindowClient, so there's no need for us to do it.
        this.varProvider.dispose();
    }

    private async ensureGroupIsVisible(group: GroupReference) {
        this.varProvider.notifyUpdateImminent();
        logger.verbose("Switching to " + group.name);
        this.visibleGroup = group.name;
        await this.windowClient.clickContextMenu(group.command);
    }

    private async fetchGroups() {
        const contextItems = await this.windowClient.getContextMenu(new Int64(0), 0);
        const start = contextItems.findIndex(item => item.text === ">View Group");
        if (start === -1) {
            return [];
        }
        const availableGroups = [];
        const cpuRegs = await this.registerInfoGenerator.getCpuRegisterGroups();
        for (const item of contextItems.slice(start + 1)) {
            if (item.text === "<") {
                break;
            }
            if (item.checked) {
                this.visibleGroup = item.text;
            }
            if (cpuRegs.some(reg => reg.name === item.text)) {
                availableGroups.push({name: item.text, command: item.command});
            }
        }
        return availableGroups;
    }

    private replaceVariableReference(variable: Variable, group: GroupReference) {
        if (variable.variablesReference > 0) {
            variable.variablesReference = this.variableReferences.create({ group: group, windowReference: variable.variablesReference });
        }
        return variable;
    }
}
