import { __isProd__ } from "@phragon-util/global-var";

function nonCond(cond: any) {
	return cond == null || cond === false || (typeof cond === "number" && (isNaN(cond) || !isFinite(cond)));
}

function warn(message: string) {
	// eslint-disable-next-line no-console
	if (typeof console !== "undefined") console.warn(message);

	try {
		// This error is thrown as a convenience so you can more easily
		// find the source for a warning that appears in the console by
		// enabling "pause on exceptions" in your JavaScript debugger.
		throw new Error(message);
		// eslint-disable-next-line no-empty
	} catch (e) {}
}

export function invariant(cond: any, message: string): asserts cond {
	if (nonCond(cond)) throw new Error(message);
}

export function warning(cond: any, message: string): void {
	if (__isProd__()) {
		return;
	}
	if (nonCond(cond)) {
		warn(message);
	}
}

const alreadyWarned: Record<string, boolean> = Object.create(null);

export function warningOnce(key: string, cond: boolean, message: string) {
	if (__isProd__()) {
		return;
	}
	if (alreadyWarned[key]) {
		return;
	}
	if (nonCond(cond)) {
		alreadyWarned[key] = true;
		warn(message);
	}
}
