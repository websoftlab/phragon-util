import type { ActionService } from "../ActionService";
import type { ActionNS } from "../types";

export interface DebugActionProps {
	id?: string;
	level?: "debug" | "info" | "warning" | "error";
	message: string;
	action?: ActionNS.ActionObjectType;
	detail?: unknown;
}

function debug(_service: ActionService, props: DebugActionProps) {
	let { id = "", level = "debug", message, action, detail } = props;
	if (!message) {
		message = "Debug message is empty";
	}
	if (id) {
		message = `[${id}] ${message}`;
	}
	switch (level) {
		case "error":
			console.error(message, detail);
			break;
		case "warning":
			console.warn(message, detail);
			break;
		case "info":
			console.info(message, detail);
			break;
		default:
			console.debug(message, detail);
			break;
	}
	if (action) {
		console.info("Debug action:", action);
	}
}

export function addDebugAction(service: ActionService) {
	return service.addAction("debug", (props: DebugActionProps) => debug(service, props));
}
