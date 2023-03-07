import { loadPackages, selectPackage } from "../workspace";
import { increment } from "../version";
import debug from "../debug";
import { conf } from "../utils";

interface IncrementCommandOption {
	scope?: string[];
	cwd?: string;
	config?: string;
}

export async function incrementCommand(_: never, option: IncrementCommandOption) {
	const config = await conf(option);
	const all = await loadPackages(config);
	const pgNames: string[] = all.map((item) => item.name);

	let names: string[] = [];

	if (option.scope == null) {
		names = await selectPackage(config);
	} else {
		for (const name of option.scope) {
			if (!pgNames.includes(name)) {
				debug("Warning! {darkRed %s} package not found", name);
			} else if (!names.includes(name)) {
				names.push(name);
			}
		}
	}

	if (!names.length) {
		return debug("Packages not selected. Exit...");
	}

	for (const name of names) {
		const details = all.find((w) => w.name === name);
		if (details) {
			const ver = await increment(details);
			if (ver.version !== details.latestVersion) {
				debug("Set {yellow %s} package version {cyan %s}", details.name, ver.version);
			}
		}
	}
}
