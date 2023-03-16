import type { BundleEntity, BundleJson, Config, WorkspacePackageDetail } from "../../types";
import { clear, isObj } from "../../utils";
import { newError } from "../../color";
import { mkdir, readdir, readFile, stat } from "fs/promises";
import debug from "../../debug";
import types from "./types";
import babel from "./babel";
import prettier from "./prettier";
import { join, basename, relative, sep } from "path";
import deepmerge from "deepmerge";

function resort(origin: Record<string, string>) {
	const dep: Record<string, string> = {};
	Object.keys(origin)
		.sort()
		.forEach((key) => {
			dep[key] = origin[key];
		});
	return dep;
}

async function buildPackageJson(
	config: Config,
	pg: WorkspacePackageDetail,
	deps: Record<string, string>,
	append: any[],
	babelRuntime: boolean
) {
	debug("{cyan %s} package: make {darkGray ./package.json}", pg.name);

	const packageData = await config.readJson(pg.cwdPath("package.json"));

	let data: any = {
		name: pg.name,
		version: deps[pg.name] || pg.latestVersion || pg.version,
		author: config.bundle.author,
		license: config.bundle.license,
		dependencies: {},
		devDependencies: {},
		repository: {
			...config.bundle.repository,
			directory: `${config.workspace.path}/${basename(pg.cwd)}`,
		},
	};

	for (const name of ["description", "keywords", "dependencies", "devDependencies", "peerDependencies"]) {
		const row = packageData[name];
		if (row) {
			data[name] = row;
		}
	}

	for (const app of append) {
		data = deepmerge(data, app);
	}

	const brKey = "@babel/runtime";
	if (babelRuntime && !data.devDependencies[brKey] && !data.dependencies[brKey]) {
		data.dependencies[brKey] = "^7.20.1";
	}

	const depNames = ["dependencies", "devDependencies", "peerDependencies"];

	function lastVer(dep: any) {
		for (const key of Object.keys(dep)) {
			const ver = dep[key];
			if (deps.hasOwnProperty(key) && (ver === "*" || ver === "latest")) {
				dep[key] = `^${deps[key]}`;
			}
		}
	}

	depNames.forEach((key) => {
		if (isObj(data[key])) {
			lastVer(data[key]);
			data[key] = resort(data[key]);
		}
	});

	// write file
	await config.writeJson(pg.tmpPath("package.json"), data);
}

async function buildBy(config: Config, pg: WorkspacePackageDetail, entity: BundleEntity) {
	const { input, output, target } = entity;

	debug(`{cyan %s} package build: {yellow %s}`, pg.name, target);
	debug(`from: {darkGray %s}`, config.localPathName(input));
	debug(`to: {darkGray %s}`, config.localPathName(output));

	// types
	if (target === "types") {
		await types(config, pg, { src: input, dest: output });
	}

	// babel build
	else if (["node", "module", "commonjs"].includes(target)) {
		await babel(config, pg, { src: input, dest: output, bundle: target });
	}

	// copy files
	else if (target === "copy") {
		await config.copy(input, output);
	}
}

const validTarget = ["types", "module", "node", "commonjs", "copy"];

async function findBabelRuntime(src: string) {
	const files = await readdir(src);
	if (!files.length) {
		return false;
	}
	for (const file of files) {
		if (file.startsWith(".")) {
			continue;
		}
		const srcFile = join(src, file);
		const info = await stat(srcFile);
		if (info.isDirectory()) {
			if (await findBabelRuntime(srcFile)) {
				return true;
			}
		} else if (info.isFile() && file.endsWith(".js")) {
			const data = (await readFile(srcFile)).toString();
			if (data.includes('require("@babel/runtime')) {
				return true;
			}
		}
	}
	return false;
}

export default async function createBuild(config: Config, pg: WorkspacePackageDetail, deps: Record<string, string>) {
	const bundleFile = pg.cwdPath("bundle.json");
	const stat = await config.stat(bundleFile);
	if (!stat || !stat.isFile) {
		throw newError("The {yellow %s} file not found!", config.localPathName(bundleFile));
	}

	debug("{cyan $} >> {darkGray %s}", config.localPathName(bundleFile));

	// prettier files format
	debug(`{cyan %s} package build: {yellow %s}`, pg.name, "prettier");
	await prettier(config, pg.cwd);

	const bundle = await config.readJson<BundleJson>(stat.file);
	const entities: BundleEntity[] = [];
	const append: any[] = [];
	const isIt = (path: string) => !path || path === "." || path === "/" || path === "./";
	let babelRuntime = false;

	for (const input of Object.keys(bundle)) {
		let points = bundle[input];
		if (!Array.isArray(points)) {
			points = [points];
		}

		const inputPath = pg.cwdPath(input);
		if (!(await config.exists(inputPath))) {
			throw newError(`The "{yellow %s}" input target not found!`, input);
		}

		for (const point of points) {
			if (!point.target) {
				throw newError(`Target for the "{yellow %s}" is empty`, input);
			}
			if (!validTarget.includes(point.target)) {
				throw newError(`Invalid target {yellow %s} for the {cyan %s} entity point`, point.target, input);
			}
			if (!point.output) {
				throw newError(`Output entity for the "{yellow %s}" is empty`, input);
			}

			const { "package.json": pJson, ...rest } = point;

			if (isObj(pJson)) {
				append.push(pJson);
			}

			entities.push({
				...rest,
				name: input,
				input: inputPath,
				output: isIt(point.output) ? pg.tmp : pg.tmpPath(point.output),
			});
		}
	}

	// clear & make tmp path
	await clear(pg.tmp);
	if (!(await config.exists(pg.tmp))) {
		await mkdir(pg.tmp);
	}

	async function mkType(entity: BundleEntity, type: "commonjs" | "module" | "types") {
		const additional = new Map();

		// normalize my\name -> my/name
		let ref = relative(pg.tmpPath("."), entity.output);
		if (ref && sep !== "/") {
			ref = ref.replace(sep, "/");
		}

		if (type === "types") {
			const file = ref ? `./${ref}/index.d.ts` : "./index.d.ts";
			if (await config.exists(pg.tmpPath(file))) {
				additional.set("types", file);
			}
		} else {
			const point = type === "commonjs" ? "main" : "module";
			const file = ref ? `./${ref}/index.js` : "./index.js";
			if (ref) {
				await config.writeJson(pg.tmpPath(`${ref}/package.json`), { type });
			} else if (type === "module") {
				additional.set("type", "module");
			}
			if (await config.exists(pg.tmpPath(file))) {
				additional.set(point, file);
			}
		}

		if (additional.size) {
			append.push(Object.fromEntries(additional));
		}
	}

	// make entities
	for (const entity of entities) {
		await buildBy(config, pg, entity);
		if (["commonjs", "node"].includes(entity.target)) {
			babelRuntime = true;
			await mkType(entity, "commonjs");
		} else if (entity.target === "module") {
			await mkType(entity, "module");
		} else if (entity.target === "types") {
			await mkType(entity, "types");
		}
	}

	if (babelRuntime) {
		babelRuntime = await findBabelRuntime(pg.tmpPath("."));
	}

	// write package.json file
	await buildPackageJson(config, pg, deps, append, babelRuntime);

	// copy files
	for (const file of ["README.md", "LICENSE"]) {
		const src = pg.cwdPath(file);
		if (await config.exists(src)) {
			await config.copy(src, pg.tmpPath(file));
		}
	}
}
