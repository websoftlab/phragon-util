import type { WorkspacePackageDetail, BundleVersionJson, Config } from "./types";
import { join } from "path";
import { readdir } from "fs/promises";
import { newError, format } from "./color";
import prompts from "prompts";

export async function selectPackage(cnf: Config, multiselect: boolean = true): Promise<string[]> {
	const all = await loadPackages(cnf);
	const question = await prompts({
		type: multiselect ? "multiselect" : "select",
		name: "name",
		message: "Select package(s) name",
		hint: "- Space to select. Return to submit",
		choices: all.map((detail) => ({
			title: detail.name,
			description:
				detail.nextVersion == null
					? undefined
					: format(
							"already incremented {gray %s} {darkGray »} {white %s}",
							detail.version,
							detail.nextVersion
					  ),
			value: detail.name,
		})),
	});

	if (question.name) {
		return Array.isArray(question.name) ? question.name : [question.name];
	}

	return [];
}

export async function packageExists(cnf: Config, name: string) {
	const packagesPath = cnf.cwd(cnf.workspace.path);
	const files = await readdir(packagesPath);

	for (let file of files) {
		const packageJsonPath = join(packagesPath, file, "package.json");
		const stat = await cnf.stat(packageJsonPath);
		if (!stat || !stat.isFile) {
			continue;
		}

		const pg = await cnf.readJson(stat.file);
		if (pg.name === name) {
			return true;
		}
	}

	return false;
}

export async function loadPackages(cnf: Config): Promise<WorkspacePackageDetail[]> {
	const packages: WorkspacePackageDetail[] = [];
	const packagesPath = cnf.cwd(cnf.workspace.path);
	const all = await readdir(packagesPath);
	const dependencies: Record<string, string[]> = {};
	const packageNames: string[] = [];

	for (let name of all) {
		const packageJsonPath = join(packagesPath, name, "package.json");
		const stat = await cnf.stat(packageJsonPath);
		if (!stat || !stat.isFile) {
			continue;
		}

		let ver: BundleVersionJson;
		const pg = await cnf.readJson(stat.file);
		const bundleVersionPath = join(packagesPath, name, "bundle-version.json");
		const statVer = await cnf.stat(bundleVersionPath);

		if (!statVer) {
			ver = {
				version: cnf.semver.version,
			};
			if (cnf.semver.preRelease) {
				ver.version += "-" + cnf.semver.preRelease;
			}
			await cnf.writeJson(bundleVersionPath, ver);
		} else if (!statVer.isFile) {
			throw newError("The {yellow %s} path mast be file", `${name}/bundle-version.json`);
		} else {
			ver = await cnf.readJson(statVer.file);
		}

		if (!pg.name) {
			throw newError("Package name is empty: {yellow %s}", `${name}/bundle-version.json`);
		}
		if (packageNames.includes(pg.name)) {
			throw newError("Duplicate package name: {yellow %s}", pg.name);
		}

		dependencies[pg.name] = pg.dependencies ? Object.keys(pg.dependencies) : [];
		if (pg.devDependencies) {
			Object.keys(pg.devDependencies).forEach((name) => {
				if (!dependencies[pg.name].includes(name)) {
					dependencies[pg.name].push(name);
				}
			});
		}

		function isIt(file: string) {
			return !file || file === "." || file === "/" || file === "./";
		}

		const cwd = join(packagesPath, name);
		const out = join(packagesPath, name, cnf.bundle.out);
		const tmp = join(packagesPath, name, cnf.bundle.tmp);

		const detail: WorkspacePackageDetail = {
			cwd,
			out,
			tmp,
			cwdPath(file: string) {
				return isIt(file) ? cwd : join(cwd, file);
			},
			outPath(file: string) {
				return isIt(file) ? out : join(out, file);
			},
			tmpPath(file: string) {
				return isIt(file) ? tmp : join(tmp, file);
			},
			nextVersion: null,
			latestVersion: null,
			release: {},
			ignoreChannel: [],
			...ver,
			name: pg.name,
			dependencies: [],
		};

		// read latest
		const statBuild = await cnf.stat(detail.outPath("package.json"));
		if (statBuild && statBuild.isFile) {
			detail.latestVersion = (await cnf.readJson(statBuild.file)).version;
		}

		packageNames.push(pg.name);
		packages.push(detail);
	}

	// fill deps
	for (const pg of packages) {
		for (const name of packageNames) {
			if (pg.name !== name && dependencies[pg.name].includes(name)) {
				pg.dependencies.push(name);
			}
		}
	}

	return packages;
}
