
/**
 * Allows registering text-based commands which can be run by a user (e.g. via the debug console).
 */
export class CommandRegistry {
    private readonly commands: Command[] = [];

    /**
     * Registers a new command
     */
    registerCommand(command: Command) {
        this.commands.push(command);
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
    runCommand(name: string): Promise<string | undefined> {
        const toRun = this.commands.find(command => command.name === name);
        if (toRun !== undefined) {
            return toRun.callback();
        }
        return Promise.reject(new Error("No such command"));
    }
}

/**
 * Function to call when a command is run. Any string returned will be displayed to the user.
 */
type CommandCallback = () => Promise<string | undefined>;

/**
 * A command which the user can run. Has a name (i.e. what the user types to run it)
 * and a function to run.
 */
export class Command {
    constructor(public readonly name: string, public readonly callback: CommandCallback) {}
}