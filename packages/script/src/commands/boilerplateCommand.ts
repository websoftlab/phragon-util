import type { Config } from "../types";
import debug from "../debug";
import prompts from "prompts";
import { conf } from "../utils";
import { packageExists } from "../workspace";
import { newError } from "../color";
import { mkdir, writeFile } from "fs/promises";
import { join, relative, sep } from "path";

async function mkDir(config: Config, path: string) {
	debug("Make project directory {cyan %s}", config.localPathName(path));
	await mkdir(path, { recursive: true });
}

async function mkFile<T = string>(config: Config, path: string, data: T) {
	debug("Create project file {cyan %s}", config.localPathName(path));
	await writeFile(path, typeof data === "string" ? data : JSON.stringify(data, null, 2));
}

interface BoilerplateCommandOption {
	cwd?: string;
	config?: string;
}

export async function boilerplateCommand(_: never, option: BoilerplateCommandOption) {
	const config = await conf(option);
	const data = await prompts([
		{
			type: "text",
			message: "Enter package name:",
			name: "name",
			validate(text: string) {
				return text.length > 1 && /^[a-z][a-z0-9\-_]*[a-z0-9]$/ ? true : "Invalid package name";
			},
		},
		{
			type: "confirm",
			message: "Use organisation name for package?",
			name: "organisation",
			initial: true,
		},
	]);

	let { name } = data;
	if (data.organisation) {
		name = `${config.workspace.name}/${name}`;
	}

	if (await packageExists(config, name)) {
		throw newError("{cyan %s} package already exists", name);
	}

	const directory = config.cwd(`${config.workspace.path}/${data.name}`);
	if (await config.exists(directory)) {
		throw newError("{cyan %s} directory already exists", `${config.workspace.path}/${data.name}`);
	}

	let rel = relative(directory, config.cwd());
	if (rel == "") {
		rel = "./";
	} else {
		if (sep !== "/") {
			rel = rel.replace(sep, "/");
		}
		rel += "/";
	}

	let version = config.semver.version;
	if (config.semver.preRelease) {
		version += `-${config.semver.preRelease}`;
	}

	await mkDir(config, directory);
	await mkDir(config, join(directory, "src"));

	await mkFile(config, join(directory, "src/index.ts"), "export {}");
	await mkFile(config, join(directory, "global.d.ts"), "");
	await mkFile(config, join(directory, "bundle-version.json"), { version });
	await mkFile(config, join(directory, "bundle.json"), {
		src: [
			{
				target: "node",
				output: ".",
			},
			{
				target: "types",
				output: ".",
				"package.json": {
					types: "./index.d.ts",
				},
			},
		],
	});

	await mkFile(config, join(directory, "tsconfig.json"), {
		extends: `${rel}tsconfig.json`,
	});

	await mkFile(config, join(directory, "tsconfig.build.json"), {
		extends: `${rel}tsconfig.build.json`,
		compilerOptions: {
			outDir: `./${config.bundle.out}`,
			rootDir: "./src",
		},
		include: ["./src/**/*", "./global.d.ts"],
	});

	await mkFile(
		config,
		join(directory, "README.md"),
		`# ${name}

The project is under construction, the description will be later

## ❯ Install

\`\`\`
$ npm install --save ${name}
\`\`\`
`
	);

	if (config.bundle.licenseText) {
		await mkFile(config, join(directory, "LICENSE"), config.bundle.licenseText);
	}

	await mkFile(config, join(directory, "package.json"), {
		name,
		version: "1.0.0",
		author: config.bundle.author,
		license: config.bundle.license,
		scripts: {
			build: `phragon-script build ${rel === "./" ? "" : `--cwd "${rel}" `}-P ${name}`,
			prettier: `phragon-script prettier ${rel === "./" ? "" : `--cwd "${rel}" `}-P ${name}`,
		},
		dependencies: {},
		exports: {
			"./": "./build/",
			".": {
				require: "./build/index.js",
			},
		},
		types: "build/index.d.ts",
		typesVersions: {
			"*": {
				"build/index.d.ts": ["src/index.ts"],
				"*": ["src/*"],
			},
		},
	});
}
