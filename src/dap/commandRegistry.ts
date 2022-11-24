/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


/**
 * Allows registering text-based commands which can be run by a user (e.g. via the debug console).
 * @typeParam Arg the type of argument passed to each command
 * @typeParam Ret the return value of each command (promisified)
 */
export class CommandRegistry<Arg, Ret> {
    private readonly commands: Command<Arg, Ret>[] = [];

    /**
     * Registers a new command
     */
    registerCommand(name: string, action: CommandCallback<Arg, Ret>) {
        this.commands.push(new Command<Arg, Ret>(name, action));
    }
    /**
     * Registers a command that performs type checking of the command argument, narrowing it from the the argument type
     * used by the command registry. If the command is run with an argument that does not pass the type check, an error
     * is thrown.
     */
    registerCommandWithTypeCheck<NarrowedArg extends Arg>(name: string, checkFun: (arg: Arg) => arg is NarrowedArg, action: CommandCallback<NarrowedArg, Ret>) {
        this.commands.push(new Command<Arg, Ret>(name, (arg => {
            if (checkFun(arg)) {
                return action(arg);
            }
            return Promise.reject(new Error("Invalid argument type"));
        })));
    }

    /**
     * The name of all registered commands
     */
    get commandNames(): string[] {
        return this.commands.map(command => command.name);
    }

    /**
     * Returns whether there is a command with the given name
     */
    hasCommand(name: string) {
        return this.commands.some(command => command.name === name);
    }

    /**
     * Runs the command with the given name (if it exists). May return a string
     * to display to the user.
     */
    runCommand(name: string, arg: Arg): Promise<Ret> {
        const toRun = this.commands.find(command => command.name === name);
        if (toRun !== undefined) {
            return Promise.resolve(toRun.callback(arg));
        }
        return Promise.reject(new Error("No such command"));
    }
}

/**
 * Function to call when a command is run.
 */
export type CommandCallback<Arg, Ret> = (argument: Arg) => Promise<Ret> | Ret;

/**
 * A command which the user can run. Has a name (i.e. what the user types to run it)
 * and a function to run.
 */
class Command<Arg, Ret> {
    constructor(public readonly name: string, public readonly callback: CommandCallback<Arg, Ret>) {}
}