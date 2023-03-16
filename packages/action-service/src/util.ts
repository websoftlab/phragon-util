import type { ActionNS } from "./types";
import type { ActionService } from "./ActionService";
import { isPlainObject } from "@phragon-util/plain-object";

export function emitAction<Prop extends {} = any, Result = void>(
	service: ActionService,
	action: ActionNS.ActionType,
	andProp?: Partial<Prop>
): Result {
	const { name, props } = getActionObject<Prop>(action, andProp);
	return service.emit<Prop, Result>(name, props);
}

export function createAction<Prop extends {} = any, Result = void>(
	service: ActionService,
	action: ActionNS.ActionType,
	andProp?: Partial<Prop>
): () => Result {
	return () => {
		return emitAction<Prop, Result>(service, action, andProp);
	};
}

export function getActionObject<Prop extends {} = any>(action: ActionNS.ActionType<Prop>, andProp?: Partial<Prop>) {
	let name: string,
		props = <Prop>{};

	if (typeof action === "string") {
		name = action;
	} else if (Array.isArray(action)) {
		name = action[0];
		if (isPlainObject(action[1])) {
			props = action[1] as Prop;
		}
	} else {
		name = action.name;
		if (isPlainObject(action.props)) {
			props = action.props as Prop;
		}
	}
	if (andProp) {
		props = { ...props, ...andProp };
	}

	return { name, props };
}
