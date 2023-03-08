export {};

declare global {
	export var __DEV__: boolean;
	export var __DEV_SERVER__: boolean;
	export var __PROD__: boolean;
	export var __BUNDLE__: string;
	export var __SSR__: boolean;
	export var __SRV__: boolean;
	export var __WEB__: boolean;
	export var __ENV__: "production" | "development";

	export interface Window {
		__DEV__: boolean;
		__DEV_SERVER__: boolean;
		__PROD__: boolean;
		__BUNDLE__: string;
		__SSR__: boolean;
		__SRV__: boolean;
		__WEB__: boolean;
		__ENV__: "production" | "development";
	}
}
