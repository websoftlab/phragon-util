const AsyncFunction = (async () => {}).constructor;
const GeneratorFunction = function* () {}.constructor;

export async function toAsync<T = any>(result: T | Promise<T>): Promise<T> {
	return result;
}

export default function isAsyncFunction(func: Function | (() => void)): boolean {
	if (typeof func !== "function") {
		return false;
	}
	return (
		(func as any)[Symbol.toStringTag] === "AsyncFunction" ||
		(func instanceof AsyncFunction && AsyncFunction !== Function && AsyncFunction !== GeneratorFunction)
	);
}
