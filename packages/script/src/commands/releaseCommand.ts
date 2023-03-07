import release from "./builders/release";
import debug from "../debug";
import { conf } from "../utils";

interface ReleaseCommandOption {
	scope?: string[];
	channel?: string[];
	cwd?: string;
	config?: string;
}

export async function releaseCommand(_: never, option: ReleaseCommandOption) {
	// channel
	const channel = option.channel || ["global"];
	if (!channel.length) {
		return debug("Release channel is not specified. Exit...");
	}

	// scope
	let scope: string[] = [];
	if (option.scope != null) {
		if (option.scope.length === 0) {
			return debug("Packages not selected. Exit...");
		} else {
			scope = option.scope;
		}
	}

	const config = await conf(option);
	for (const name of channel) {
		await release(config, name, scope);
	}
}
