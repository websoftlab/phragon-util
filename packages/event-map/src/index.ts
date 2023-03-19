import { isPlainObject } from "@phragon-util/plain-object";

export type ListenersData = Map<string, Set<Evn>>;
export type ListenerUnsubscribe = () => void;

export class Evn {
	name: string;
	unsubscribe: () => void;

	constructor(listeners: ListenersData, name: string, public listener: Function, public once: boolean) {
		this.name = name;
		this.unsubscribe = () => {
			const map = listeners.get(name);
			if (map) {
				if (map.has(this)) {
					map.delete(this);
					if (map.size === 0) {
						listeners.delete(name);
					}
				}
			}
			this.close();
		};
		if (!listeners.has(name)) {
			listeners.set(name, new Set());
		}
		listeners.get(name)!.add(this);
	}

	emit(..._args: any[]) {}
	close() {}
}

export function has(listeners: ListenersData, action: string, listener?: Function): boolean {
	const map = listeners.get(action);
	if (!map) {
		return false;
	}
	if (typeof listener !== "function") {
		return listener == null;
	}
	for (const evn of map) {
		if (evn.listener === listener) {
			return true;
		}
	}
	return false;
}

export function subscribe(
	listeners: ListenersData,
	action: string | string[],
	listener: Function,
	once: boolean,
	observe: (evn: Evn) => void
): ListenerUnsubscribe {
	if (typeof listener !== "function") {
		return () => {};
	}

	if (Array.isArray(action)) {
		const unsubscribes: ListenerUnsubscribe[] = [];
		for (let actionName of action) {
			if (typeof actionName === "string") {
				unsubscribes.push(subscribe(listeners, actionName, listener, once, observe));
			}
		}
		return () => {
			for (let unsubscribe of unsubscribes) {
				unsubscribe();
			}
		};
	}

	let evn: Evn | null = new Evn(listeners, action, listener, once);
	evn.close = () => {
		// delete an object from memory
		evn = null;
	};

	observe(evn);

	return evn.unsubscribe;
}

export function createPlainEvent(name: string, event: any) {
	const origin = event;
	let isOrigin = false;

	if (event == null) {
		event = {};
	} else if (!isPlainObject(event)) {
		isOrigin = true;
		event = {};
	}

	Object.defineProperty(event, "name", {
		get() {
			return name;
		},
		enumerable: true,
		configurable: false,
	});

	if (isOrigin) {
		Object.defineProperty(event, "origin", {
			get() {
				return origin;
			},
			enumerable: true,
			configurable: false,
		});
	}

	return event;
}
