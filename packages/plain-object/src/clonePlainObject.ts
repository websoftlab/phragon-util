import { isPlainObject } from "./isPlainObject";

function cloneArray<T>(obj: T[]): T[] {
	const copy: T[] = [];
	for (let i = 0, len = obj.length; i < len; i++) {
		copy[i] = cloneObject(obj[i]);
	}
	return copy;
}

function cloneObject<T = any>(obj: T): T {
	// Handle null or undefined
	if (null == obj) {
		return obj;
	}

	// 3 simple types, symbol and BigInt
	const tof = typeof obj;
	if (tof === "number" || tof === "string" || tof === "boolean" || tof === "symbol") {
		return obj;
	}
	if (tof === "bigint") {
		return BigInt(obj.toString()) as T;
	}

	// Handle Array
	if (Array.isArray(obj)) {
		return cloneArray(obj) as T;
	}

	let copy: any;

	// Handle Date
	if (obj instanceof Date) {
		copy = new Date();
		copy.setTime(obj.getTime());
		return copy;
	}

	// Handle Object
	if (isPlainObject(obj)) {
		const nullable = obj.constructor === undefined;
		copy = Object.create(nullable ? null : {});
		for (let name in obj) {
			if (nullable || (obj as Object).hasOwnProperty(name)) {
				copy[name] = cloneObject(obj[name]);
			}
		}
		return copy;
	}

	throw new Error("Unable to copy obj! Its type isn't supported.");
}

export function clonePlainArray<T = any>(obj: T[]): T[] {
	if (Array.isArray(obj)) {
		return cloneArray(obj);
	}
	throw new Error("Unable to copy obj! Object must be array.");
}

export function clonePlainObject<T extends {} = any>(obj: T): T {
	if (isPlainObject(obj)) {
		return cloneObject(obj);
	}
	throw new Error("Unable to copy obj! Object must be plain.");
}
