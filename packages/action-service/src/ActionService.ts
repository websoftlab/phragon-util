import type { Hotkeys, KeyHandler } from "hotkeys-js";
import type { ActionNS, ActionServiceOptions } from "./types";
import { isPlainObject } from "@phragon-util/plain-object";
import { warningOnce } from "@phragon-util/proof";
import { addErrorAction, addDebugAction, addCallbackAction, addLocationAction } from "./actions";

const hotkeySymbol = Symbol.for("hotkey");
const STORE_KEY = Symbol();
const LISTENER_KEY = Symbol();

function store(service: ActionService) {
	return service[STORE_KEY];
}

function isOption(object: any): object is ActionNS.ActionOptions {
	return isPlainObject(object) && typeof object.action === "function";
}

function protect(service: ActionService, name: string) {
	if (["error", "debug"].includes(name) && store(service).has(name)) {
		throw new Error(`The ${name} action is a system action and cannot be changed.`);
	}
}

function emitOn<Prop extends {}, Result>(service: ActionService, name: string, props?: Prop): Result {
	if (props == null) {
		props = {} as Prop;
	}

	for (const cb of service[LISTENER_KEY]) {
		try {
			const renew = cb({ name, props });
			if (renew != null) {
				if (renew.type === "abort") {
					return renew.result as Result;
				}
				if (renew.type === "stop") {
					if (isPlainObject(renew.props)) {
						props = renew.props as Prop;
					}
					break;
				}
				if (renew.type === "update" && isPlainObject(renew.props)) {
					props = renew.props as Prop;
				}
			}
		} catch (error) {
			if (name !== "error") {
				emitOn(service, "error", { error });
			} else {
				throw error;
			}
		}
	}

	const action = store(service).get(name)!.action as ActionNS.ActionHandler<Prop, Result>;
	return action(props, name);
}

interface ActionEntry<Prop extends {}, Result> {
	readonly name: string;
	readonly title: string;
	readonly description: string | undefined;
	hidden: boolean;
	action: ActionNS.ActionHandler<Prop, Result>;
	destroy: Function;
	hotkey: string | null;
	wrapper?: string;
}

export class ActionService {
	[LISTENER_KEY]: Set<ActionNS.Listener> = new Set<ActionNS.Listener>();
	[STORE_KEY]: Map<string, ActionEntry<any, void>> = new Map();

	readonly hotkeys: Hotkeys | null = null;

	constructor(options: ActionServiceOptions = {}) {
		const { hotkeys } = options;
		if (hotkeys) {
			this.hotkeys = hotkeys;
		}
		addErrorAction(this);
		addDebugAction(this);
		addCallbackAction(this);
		addLocationAction(this);
	}

	get names() {
		return [...store(this).values()].filter((item) => !item.hidden).map((item) => item.name);
	}

	get allNames() {
		return [...store(this).keys()];
	}

	get actions() {
		const actionList: ActionNS.Action[] = [];
		const self = this;
		for (const item of store(this).values()) {
			if (item.hidden) {
				continue;
			}
			const { name, hotkey } = item;
			actionList.push({
				name,
				hotkey,
				get title() {
					return item.title;
				},
				get description() {
					return item.description;
				},
				action() {
					return self.emit(name, {});
				},
			});
		}
		return actionList;
	}

	emit<Prop extends {} = any, Result = void>(name: string, props?: Prop): Result {
		if (store(this).has(name)) {
			return emitOn<Prop, Result>(this, name, props);
		}
		const error = new Error(`The '${name}' action is not defined`);
		if (name === "error") {
			throw error;
		}
		return this.emit("error", {
			error,
			action: {
				name,
				props,
			},
		});
	}

	subscribe<Prop extends {} = any>(listener: ActionNS.Listener<Prop>) {
		const list = this[LISTENER_KEY];
		if (typeof listener === "function" && !list.has(listener)) {
			list.add(listener);
		}
		return () => {
			list.delete(listener);
		};
	}

	addActions(list: Record<string, ActionNS.ActionHandler | ActionNS.ActionOptions>) {
		const undo = Object.keys(list).map((name) => this.addAction(name, list[name]));
		return () => {
			undo.forEach((cb) => cb());
		};
	}

	addAction<Prop extends {} = any, Result = void>(
		name: string,
		action: ActionNS.ActionHandler<Prop, Result> | ActionNS.ActionOptions<Prop, Result>
	) {
		protect(this, name);
		let opts: Omit<ActionNS.ActionOptions, "action"> = {};
		if (isOption(action)) {
			const { action: cb, ...rest } = action;
			action = cb;
			opts = rest;
		}

		if (typeof action !== "function") {
			throw new Error("Action must be function");
		}

		const map = store(this);
		const destroyList: Function[] = [];

		let { title, hotkey = null, description, hidden } = opts;
		if (!title) {
			title = `[${name}]`;
		}
		if (typeof hidden !== "boolean") {
			hidden = !!hotkey;
		}

		// hotkey
		const hotkeys = this.hotkeys;
		if (hotkey && hotkeys) {
			const hotkeyHandler: KeyHandler = (keyboardEvent) => {
				if (map.has(name)) {
					keyboardEvent.preventDefault();
					this.emit(name, { [hotkeySymbol]: true });
				}
			};
			hotkeys(hotkey, hotkeyHandler);
			destroyList.push(() => {
				hotkeys.unbind(hotkey as string, hotkeyHandler);
			});
		} else {
			hotkey = null;
		}

		const destroy = () => {
			if (map.has(name) && map.get(name)!.action === action) {
				map.delete(name);
				destroyList.forEach((close) => close());
			}
		};

		map.set(name, {
			name,
			get title() {
				return typeof title === "function" ? title() : (title as string);
			},
			get description() {
				return typeof description === "function" ? description() : description;
			},
			hidden,
			action,
			hotkey,
			destroy,
		});

		return destroy;
	}

	hasAction(name: string): boolean {
		return store(this).has(name);
	}

	removeAction(name: string) {
		protect(this, name);
		const map = store(this);
		if (map.has(name)) {
			map.get(name)!.destroy();
		}
	}

	wrapAction<Prop extends {} = any>(
		originName: string,
		name: string,
		props?: Prop,
		options: Omit<ActionNS.ActionOptions, "action"> = {}
	): () => void {
		const map = store(this);
		if (!map.has(originName)) {
			warningOnce(`action-not-found:${originName}`, false, `The ${originName} action is not defined!`);
			return () => {};
		}

		if (originName === name) {
			throw new Error("The name of the original action cannot be equivalent to the name of the wrapper action");
		}

		protect(this, name);
		const destroyList: Function[] = [];
		const origin = map.get(originName) as ActionEntry<any, any>;
		const last = map.has(name) ? (map.get(name) as ActionEntry<any, any>) : false;
		let { title, hotkey = null, description, hidden } = options;

		if (!title) {
			title = origin.title;
		}
		if (!description) {
			description = origin.description;
		}
		if (typeof hidden !== "boolean") {
			hidden = origin.hidden;
		}

		// hotkey
		const hotkeys = this.hotkeys;
		if (hotkey && hotkeys) {
			const hotkeyHandler: KeyHandler = (keyboardEvent) => {
				if (map.has(name)) {
					keyboardEvent.preventDefault();
					this.emit(name, { [hotkeySymbol]: true, ...props });
				}
			};
			hotkeys(hotkey, hotkeyHandler);
			destroyList.push(() => {
				hotkeys.unbind(hotkey as string, hotkeyHandler);
			});
		} else {
			hotkey = null;
		}

		const action = (andProps: any, name: string) => {
			if (!map.has(originName)) {
				throw new Error(`The '${originName}' action is not defined`);
			}
			const callProps = {
				...props,
				...andProps,
			};
			return origin.action(callProps, name);
		};

		const destroy = () => {
			if (map.has(name) && map.get(name)!.action === action) {
				if (last === false) {
					map.delete(name);
				} else {
					map.set(name, last);
				}
				destroyList.forEach((close) => close());
			}
		};

		map.set(name, {
			name,
			get title() {
				return title ? (typeof title === "function" ? title() : title) : origin.title;
			},
			get description() {
				return description
					? typeof description === "function"
						? description()
						: description
					: origin.description;
			},
			hidden,
			hotkey,
			wrapper: originName,
			action,
			destroy,
		});

		return destroy;
	}
}
