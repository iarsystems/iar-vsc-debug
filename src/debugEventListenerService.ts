import * as Thrift from "thrift";
import * as DebugEventListener from "./thrift/bindings/DebugEventListener";
import { DebugEvent, LogEvent, InspectionContextChangedEvent, BaseContextChangedEvent, DkNotifyConstant } from "./thrift/bindings/cspy_types";
import * as Q from "q";

type DebugEventCallback = (event: DebugEvent) => any;

/**
 * Implements the DebugEventListener thrift service,
 * and provides ways for others to listen for specific events
 */
export class DebugEventListenerHandler {
	private readonly debugEventCallbacks: Record<DkNotifyConstant, DebugEventCallback[]>;


	/**
	 * Register a callback to be called when receiving debug events of the specified type.
	 */
	public observeDebugEvent(type: DkNotifyConstant, callback: DebugEventCallback) {
		if (!this.debugEventCallbacks[type]) {
			this.debugEventCallbacks[type] = [];
		}
		this.debugEventCallbacks[type].push(callback);
	}

	/// Callbacks from C-SPY

	/**
	 * Called whenever a debug event happens. See DkNotifySubscriber#Notify.
	 */
	postDebugEvent(event: DebugEvent): Q.Promise<void> {
		console.log(`DEBUGEVENT (${event.note}): ${event.descr}`, event.params);
		return Q.resolve();
	}

	/**
	 * This one should not be oneway, since we need to make sure that the
	 * client has actually recevied the message before proceeding. This will
	 * otherwise prevent e.g. fatal error messages from being seen.
	 */
	postLogEvent(event: LogEvent): Q.Promise<void> {
		console.log("LOGEVENT: " + event.text);
		return Q.resolve();
	}

	/**
	 * Triggered on kDkInspectionContextChanged.
	 */
	postInspectionContextChangedEvent(event: InspectionContextChangedEvent): Q.Promise<void> {
		console.log("ASDF");
		console.log("INSPECTIONCONTEXT", event.context);
		return Q.resolve();
	}


	/**
	 * Triggered on kDkBaseContextChanged.
	 */
	postBaseContextChangedEvent(event: BaseContextChangedEvent): Q.Promise<void> {
		console.log("BASECONTEXT", event.context);
		return Q.resolve();
	}

}

export namespace DebugEventListenerService {
	export function create(port: number) {
		const serverOpt: Thrift.ServerOptions<DebugEventListener.Processor, DebugEventListenerHandler> = {
			transport: Thrift.TBufferedTransport,
			protocol: Thrift.TBinaryProtocol,
		};
		return Thrift.createServer(DebugEventListener, new DebugEventListenerHandler(), serverOpt)
						.on('error', console.log)
						.listen(port);
	}
}