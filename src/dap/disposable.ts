
/**
 * An object that can be or needs to disposed of,
 * in order to release some resource(s) held by it.
 *
 * Similar to vscode's Disposable, but redeclared here to avoid
 * having DAP code depend on vscode interfaces.
 */
export interface Disposable {
	dispose(): void | Promise<void>;
}