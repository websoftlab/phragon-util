import { conf } from "../utils";
import { loadPackages } from "../workspace";
import prettier from "./builders/prettier";
import debug from "../debug";

interface PrettierCommandOption {
	scope?: string[];
	cwd?: string;
	config?: string;
}

export async function prettierCommand(_: never, option: PrettierCommandOption) {
	const config = await conf(option);
	const all = await loadPackages(config);
	const directories: string[] = [];

	if (option.scope == null) {
		all.forEach((pg) => {
			directories.push(pg.cwd);
		});
	} else if (option.scope.length) {
		const ref: Record<string, string> = {};
		all.forEach((pg) => {
			ref[pg.name] = pg.cwd;
		});
		for (const name of option.scope) {
			if (ref.hasOwnProperty(name)) {
				directories.push(ref[name]);
			} else {
				debug("Warning! {darkRed %s} package not found", name);
			}
		}
	}

	if (!directories.length) {
		return debug("Packages not selected. Exit...");
	}

	for (const directory of directories) {
		await prettier(config, directory);
	}
}
