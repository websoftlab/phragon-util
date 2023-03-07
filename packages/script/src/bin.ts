#!/usr/bin/env node

import { createCommander } from "@phragon/cli-commander";
import util from "util";
import { boilerplateCommand, incrementCommand, prettierCommand, buildCommand, releaseCommand } from "./commands";

const commander = createCommander({
	prompt: "phragon-script",
	version: "1.0",
	description: "Workspace project builder",
	stream: process.stderr,
});

function cmd(name: string) {
	const command = commander(name)
		.strict(true)
		.option("--config", { type: "value", required: false, description: "Config path" })
		.option("--cwd", { type: "value", required: false, description: "Script root path" });

	// with --scope
	if (["prettier", "build", "increment"].includes(name)) {
		return command.option("--scope", {
			alt: "-P",
			type: "multiple",
			description: "Package name(s)",
		});
	}

	return command;
}

cmd("boilerplate").description("Create a boilerplate workspace package").action(boilerplateCommand);

cmd("increment").description("Change package version").action(incrementCommand);

cmd("prettier").description("Reformat code prettier").action(prettierCommand);

cmd("build").description("Make package(s) build").action(buildCommand);

cmd("release")
	.description("Publish marked package(s) for NPM")
	.option("--channel", {
		alt: "-C",
		type: "multiple",
		required: true,
		description: "NPM channel(s) (default 'global')",
	})
	.action(releaseCommand);

commander
	.begin()
	.then((code) => {
		if (code !== -1) {
			process.exit(code);
		}
	})
	.catch((err) => {
		process.stderr.write(util.format("Process failure", err));
		process.exit(1);
	});
