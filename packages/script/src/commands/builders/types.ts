import type { Config, WorkspacePackageDetail } from "../../types";
import cmd from "../../cmd";
import { newError } from "../../color";

type BuilderTypesOptions = {
	src: string;
	dest: string;
};

export default async function types(config: Config, pg: WorkspacePackageDetail, options: BuilderTypesOptions) {
	const typescriptConfigPath = pg.cwdPath("./tsconfig.build.json");
	if (!(await config.exists(typescriptConfigPath))) {
		throw newError("Typescript config file {yellow %s} not found", "./tsconfig.build.json");
	}

	const env = {
		NODE_ENV: "production",
	};

	const args = ["tsc", "-p", typescriptConfigPath, "--rootDir", options.src, "--outDir", options.dest];

	await cmd("yarn", args, { env: { ...process.env, ...env } });
}
