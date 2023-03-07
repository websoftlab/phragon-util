import type { Config } from "../types";
import { mkdir, readdir, stat, rename } from "fs/promises";
import { dirname, join, sep } from "path";
import debug from "../debug";
import { newError } from "../color";

async function mv(config: Config, src: string, dst: string) {
	await rename(src, dst);
	debug(`Move file from {yellow %s} to {yellow %s}`, config.localPathName(src), config.localPathName(dst));
}

async function checkDir(config: Config, dst: string) {
	const fileDir = dirname(dst);
	if (!(await config.exists(fileDir))) {
		await mkdir(fileDir, { recursive: true });
	}
}

async function checkExists(config: Config, src: string, dst: string) {
	if (await config.exists(dst)) {
		throw newError(
			"Can't move file from {yellow %s} to {yellow %s}, target file already exists",
			config.localPathName(src),
			config.localPathName(dst)
		);
	}
}

export default async function move(config: Config, src: string, dst: string) {
	if (src === dst || !(await config.exists(src))) {
		return;
	}

	if (src.startsWith(dst.concat(sep)) || dst.startsWith(src.concat(sep))) {
		throw newError(
			"Can't move file from {yellow %s} to {yellow %s}, there is a nested dependency",
			config.localPathName(src),
			config.localPathName(dst)
		);
	}

	const info = await stat(src);
	if (info.isFile()) {
		await checkExists(config, src, dst);
		await checkDir(config, dst);
		await mv(config, src, dst);
		return;
	}

	if (!info.isDirectory()) {
		return;
	}

	const files = await readdir(src);
	const items: Array<{ src: string; dst: string }> = [];

	for (const file of files) {
		const srcPath = join(src, file);
		const dstPath = join(dst, file);

		const info = await stat(srcPath);
		if (info.isDirectory() || info.isFile()) {
			await checkExists(config, srcPath, dstPath);
			items.push({
				src: srcPath,
				dst: dstPath,
			});
		}
	}

	await checkDir(config, dst);
	for (const item of items) {
		await mv(config, item.src, item.dst);
	}
}
