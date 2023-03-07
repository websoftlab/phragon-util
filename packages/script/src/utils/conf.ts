import type { Config, ConfigJson, EStat } from "../types";
import type { WriteFileOptions } from "fs";
import existsStat from "./existsStat";
import readJsonFile from "./readJsonFile";
import writeJsonFile from "./writeJsonFile";
import exists from "./exists";
import move from "./move";
import copy from "./copy";
import { newError } from "../color";
import * as process from "process";
import { isAbsolute, join, normalize, relative } from "path";
import { realpath } from "fs/promises";

let data: Config | null = null;

interface ConfOption {
	config?: string;
	cwd?: string;
}

async function getCwd(option: ConfOption): Promise<string> {
	let cwd = option.cwd || ".";
	if (cwd.length === 0 || cwd === "." || cwd === "./") {
		cwd = process.cwd();
	} else if (!isAbsolute(cwd)) {
		cwd = join(process.cwd(), cwd);
	}

	// check cwd path
	const cwdStat = await existsStat(cwd);
	if (!cwdStat) {
		throw newError("CWD path {yellow %s} is not exists", cwd);
	}
	if (!cwdStat.isDirectory) {
		throw newError("CWD path {yellow %s} is not directory", cwd);
	}

	cwd = normalize(cwdStat.file);
	cwd = await realpath(cwd);

	if (cwd !== process.cwd()) {
		process.chdir(cwd);
	}

	return cwd;
}

async function load(option: ConfOption): Promise<Config> {
	const cwd = await getCwd(option);
	const file = join(cwd, option.config || "./phragon-build.conf.json");
	const stat = await existsStat(file);
	if (!stat || !stat.isFile) {
		throw newError("Config file {yellow %s} not found", "./phragon-build.conf.json");
	}

	const data = await readJsonFile<ConfigJson>(stat.file);
	const config: Config = Object.freeze({
		...data,
		dependencies: data.dependencies == null ? {} : data.dependencies,
		path: stat.file,
		exists(file: string): Promise<boolean> {
			return exists(file);
		},
		stat(file: string): Promise<EStat | null> {
			return existsStat(file);
		},
		cwd(...args: string[]) {
			return args.length ? join(cwd, ...args) : cwd;
		},
		readJson<T extends {} = any>(file: string): Promise<T> {
			return readJsonFile<T>(file);
		},
		writeJson<T extends {} = any>(file: string, data: T, options?: WriteFileOptions | null): Promise<void> {
			return writeJsonFile<T>(file, data, options);
		},
		localPathName(file: string): string {
			if (file === cwd) {
				return "./";
			}
			let local = relative(cwd, file);
			if (local.includes("\\")) {
				local = local.replace(/\\/g, "/");
			}
			return local;
		},
		move(src: string, dst: string): Promise<void> {
			return move(config, src, dst);
		},
		copy(src: string, dst: string): Promise<void> {
			return copy(config, src, dst);
		},
	});

	return config;
}

export default async function conf(option: ConfOption = {}): Promise<Config> {
	if (!data) {
		data = await load(option);
	}
	return data;
}
