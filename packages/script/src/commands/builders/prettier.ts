import type { Config } from "../../types";
import cmd from "../../cmd";
import { join, sep } from "path";

async function prettierCmd(config: Config, parser: string, files: string[]) {
	// prettier-ignore
	const args = [
		"--config", config.cwd(".prettierrc.json"),
		"--parser", parser,
		"--write"
	].concat(files);

	return cmd(`prettier`, args, { cwd: config.cwd() });
}

export default async function prettier(config: Config, dir: string) {
	const files: string[] = [];

	// base src
	const src = join(dir, "./src");
	if (await config.exists(src)) {
		files.push([src, "**", "*.{ts,tsx}"].join(sep));
	} else {
		files.push([dir, "*.ts"].join(sep));
	}

	// base types
	const types = join(dir, "./types");
	if (await config.exists(types)) {
		files.push([types, "**", "*.ts"].join(sep));
	}

	await prettierCmd(config, `typescript`, files);

	files.length = 0;
	const json: string[] = ["package.json", "bundle.json", "tsconfig.build.json", "tsconfig.json"];

	// other files
	for (const item of json) {
		const file = join(dir, item);
		if (await config.exists(file)) {
			files.push(file);
		}
	}

	if (files.length > 0) {
		await prettierCmd(config, `json`, files);
	}
}
