import type { Hotkeys } from "hotkeys-js";

export interface ActionServiceOptions {
	hotkeys?: Hotkeys;
}

export namespace ActionNS {
	export interface Action {
		name: string;
		title: string;
		description: string | undefined;
		action: Function;
		hotkey: string | null;
	}

	export type ActionArrayType<Props extends {} = any> = [string, Props?];

	export type ActionObjectType<Props extends {} = any> = { name: string; props?: Props };

	export type ActionType<Props extends {} = any> = string | ActionArrayType<Props> | ActionObjectType<Props>;

	export type ActionHandler<Props extends {} = any, Result = void> = (props: Props, name: string) => Result;

	export type Listener<Props extends {} = any> = (
		action: ActionObjectType<Props>
	) => { type: "update"; props: Props } | { type: "stop"; props?: Props } | { type: "abort"; result: unknown } | null;

	export interface ActionOptions<Props extends {} = any, Result = any> {
		action: ActionHandler<Props, Result>;
		title?: string | (() => string);
		description?: string | (() => string);
		hotkey?: string;
		hidden?: boolean;
	}
}
