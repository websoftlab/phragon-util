import type { ActionService } from "../ActionService";

export interface CallbackActionProps<T = any, Args = any[]> {
	callback: Function;
	target?: T;
	args?: Args;
}

function callback(service: ActionService, props: CallbackActionProps, alternative: Function) {
	let { callback, target, args = [] } = props;
	const isT = "hasOwnProperty" in target ? target.hasOwnProperty("target") : typeof target !== "undefined";
	if (typeof callback !== "function") {
		callback = alternative;
	}
	try {
		if (isT) {
			callback.apply(target, args);
		} else {
			callback(...args);
		}
	} catch (err) {
		service.emit("debug", {
			id: "callback-failure",
			level: "error",
			message: (err as any).message || String(err),
		});
	}
}

export function addCallbackAction(service: ActionService) {
	function callbackIsNotDefined() {
		throw new Error("Callback is not defined");
	}
	return service.addAction("callback", (props: CallbackActionProps) =>
		callback(service, props, callbackIsNotDefined)
	);
}
