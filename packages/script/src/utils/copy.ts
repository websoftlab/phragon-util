import type { Config } from "../types";
import { copyFile, mkdir, readdir, stat } from "fs/promises";
import { dirname, join } from "path";
import debug from "../debug";

async function cpFile(config: Config, src: string, dst: string) {
	// file exists
	if (await config.exists(dst)) {
		return;
	}

	const fileDir = dirname(dst);
	if (!(await config.exists(fileDir))) {
		await mkdir(fileDir, { recursive: true });
	}

	await copyFile(src, dst);
	debug(`Copy file from {yellow %s} to {yellow %s}`, config.localPathName(src), config.localPathName(dst));
}

async function cpDirectory(config: Config, src: string, dst: string) {
	// make directory
	if (!(await config.exists(dst))) {
		await mkdir(dst);
	}

	const files = await readdir(src);

	for (const file of files) {
		const srcPath = join(src, file);
		const dstPath = join(dst, file);

		const info = await stat(srcPath);
		if (info.isDirectory()) {
			await cpDirectory(config, srcPath, dstPath);
		} else if (info.isFile()) {
			await cpFile(config, srcPath, dstPath);
		}
	}
}

export default async function copy(config: Config, src: string, dst: string) {
	if (!(await config.exists(src))) {
		return;
	}

	const info = await stat(src);
	if (info.isFile()) {
		return cpFile(config, src, dst);
	}

	if (!info.isDirectory()) {
		return;
	}

	// create dest path
	if (!(await config.exists(dst))) {
		debug(`Make directory {yellow %s}`, config.localPathName(dst));
		await mkdir(dst, { recursive: true });
	}

	return cpDirectory(config, src, dst);
}
