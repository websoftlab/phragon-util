import type { Config, ConfigChannel, BundleVersionJson } from "../../types";
import { newError, format } from "../../color";
import prompts from "prompts";
import debug from "../../debug";
import { loadPackages } from "../../workspace";
import cmd from "../../cmd";
import spawn from "cross-spawn";
import cmdData from "../../cmd-data";
import * as process from "process";

function createNpmArgs(args: string | string[], channel: ConfigChannel) {
	if (typeof args === "string") {
		args = [args];
	}
	if (args[0] === "publish" && !channel.registry) {
		args.push("--access", "public");
	}
	if (channel.registry) {
		args.push("--registry", channel.registry);
	}
	return args;
}

async function setNpmUser(channel: ConfigChannel, logout = false) {
	if (logout) {
		await cmd("npm", createNpmArgs("logout", channel));
	}

	const data = await prompts([
		{
			type: "password",
			message: format("Enter password for user {cyan %s}:", channel.user),
			name: "password",
			validate: (text) =>
				String(text || "").trim().length > 3
					? true
					: "Password is required! Please pick a password longer than 3 characters.",
		},
		{
			type: "text",
			message: format("Enter email for user {cyan %s}:", channel.user),
			name: "email",
			validate: (text) => (/^.+?@.+?\.[a-z]+$/.test(text) ? true : "Enter valid email"),
		},
	]);

	const proc = await spawn("npm", createNpmArgs("login", channel), {
		stdio: ["pipe", "pipe", "inherit"],
	});

	function writeIn(message: string) {
		proc.stdin?.write(message + "\n");
	}

	if (!proc.stdout || !proc.stdin) {
		proc.kill();
		throw new Error("Login failure, can't open new process");
	}

	let ok: () => void;
	let er: (err: unknown) => void;
	let quit = false;

	const promise = new Promise<void>((resolve, reject) => {
		ok = () => {
			if (!quit) {
				quit = true;
				resolve();
			}
		};
		er = (err) => {
			if (!quit) {
				reject(err);
			}
		};
	});

	proc.stdout.on("data", (chunk) => {
		chunk = chunk && chunk.toString().trim();
		switch (chunk) {
			case "Username:":
				return writeIn(channel.user);
			case "Password:":
				return writeIn(data.password);
		}
		if (chunk.startsWith("Email")) {
			return writeIn(data.email);
		}
		if (chunk.includes("Enter one-time password:")) {
			prompts([
				{
					type: "text",
					message: format("Enter one-time password ({yellow you are using two-factor authentication}):"),
					name: "code",
				},
			])
				.then((data) => {
					writeIn(data.code);
				})
				.catch((err) => {
					er(err);
				});
			return;
		}
		process.stdout.write(chunk + "\n");
		if (chunk.startsWith("Logged in as")) {
			return;
		}
		er(new Error("Unknown npm answer..."));
	});

	proc.on("close", (code) => {
		if (code === 0) {
			ok();
		} else {
			er(new Error("Login failure"));
		}
	});

	return promise;
}

async function getNpmUser(channel: ConfigChannel) {
	try {
		const user = await cmdData("npm", createNpmArgs("whoami", channel));
		return String(user || "").trim() || null;
	} catch (err) {
		if ((err as Error).message.includes("code ENEEDAUTH")) {
			return null;
		} else {
			throw err;
		}
	}
}

export default async function release(config: Config, name: string, scope: string[] = []) {
	const channel = config.release[name];
	if (!channel) {
		throw newError("The {yellow %s} channel not found", name);
	}

	const user = await getNpmUser(channel);
	if (!user) {
		await setNpmUser(channel);
	} else if (user !== channel.user) {
		const question = await prompts({
			type: "confirm",
			message: format(
				"You are already signed in as {yellow %s}. Want to log out and log in as {cyan %s}?",
				user,
				channel.user
			),
			name: "yes",
		});
		if (!question.yes) {
			return debug("Operation aborted. Goodbye...");
		}
		await setNpmUser(channel, true);
	}

	const all = (await loadPackages(config)).filter((pg) => {
		const ver = pg.release[name];
		if ((ver && ver === pg.version) || pg.ignoreChannel.includes(name)) {
			return false;
		}
		if (scope.length > 0) {
			return scope.includes(pg.name);
		}
		return true;
	});

	if (!all.length) {
		return debug(`All packages have already been released for channel ${name}`);
	}

	const release: { name: string; version: string }[] = [];

	for (const pg of all) {
		debug("Publish {yellow %s} package...", pg.name);
		await cmd("npm", createNpmArgs("publish", channel), {
			cwd: pg.out,
		});

		// update JsonFile
		await config.writeJson<BundleVersionJson>(pg.cwdPath("bundle-version.json"), {
			version: pg.version,
			ignoreChannel: pg.ignoreChannel,
			release: {
				...pg.release,
				[name]: pg.version,
			},
		});

		release.push({
			name: pg.name,
			version: pg.version,
		});
	}

	release.forEach((item) => {
		debug("Publish channel {white %s}: {yellow %s}@{green %s} ...", name, item.name, item.version);
	});
}
