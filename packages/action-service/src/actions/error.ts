import type { ActionService } from "../ActionService";
import type { ActionNS } from "../types";

export interface ErrorActionProps {
	error: unknown;
	action?: ActionNS.ActionObjectType;
	detail?: unknown;
}

function error(_service: ActionService, props: ErrorActionProps) {
	let { error } = props;
	if (error == null) {
		error = new Error("Error is undefined or null");
	}
	throw error;
}

export function addErrorAction(service: ActionService) {
	return service.addAction("error", (props: ErrorActionProps) => error(service, props));
}
