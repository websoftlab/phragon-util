import type { Config, WorkspacePackageDetail } from "../../types";
import cmd from "../../cmd";
import { newError } from "../../color";

type BuilderBabelOptions = {
	bundle: string;
	src: string;
	dest: string;
};

export default async function babel(config: Config, _pg: WorkspacePackageDetail, options: BuilderBabelOptions) {
	const babelConfigPath = config.cwd("babel.config.js");
	if (!(await config.exists(babelConfigPath))) {
		throw newError("{yellow %s} not found", "./babel.config.js");
	}

	const env = {
		NODE_ENV: "production",
		BABEL_ENV: options.bundle,
	};

	const extensions: string[] = [".js", ".ts", ".tsx"];

	const ignore: string[] = ["**/*.d.ts"];

	// prettier-ignore
	const args = [
		"babel",
		'--config-file', babelConfigPath,
		'--extensions', extensions.join(','), options.src,
		'--out-dir', options.dest,
		'--ignore', ignore.join(", ")
	];

	await cmd(`yarn`, args, { env: { ...process.env, ...env } });
}
