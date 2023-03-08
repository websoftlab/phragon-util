import { isPlainObject } from "./isPlainObject";

export function clonePlainObject<T = any>(obj: T): T {
	let copy: any;

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

	// Handle Date
	if (obj instanceof Date) {
		copy = new Date();
		copy.setTime(obj.getTime());
		return copy;
	}

	// Handle Array
	if (Array.isArray(obj)) {
		copy = [];
		for (let i = 0, len = obj.length; i < len; i++) {
			copy[i] = clonePlainObject(obj[i]);
		}
		return copy;
	}

	// Handle Object
	if (isPlainObject(obj)) {
		const nullable = obj.constructor === undefined;
		copy = Object.create(nullable ? null : {});
		for (let name in obj) {
			if (nullable || (obj as Object).hasOwnProperty(name)) {
				copy[name] = clonePlainObject(obj[name]);
			}
		}
		return copy;
	}

	throw new Error("Unable to copy obj! Its type isn't supported.");
}
