#!/usr/bin/env bun
import { Command } from "commander";

import { createCheckCommand } from "./commands/check";
import { createGenerateCommand } from "./commands/generate";
import { createScanCommand } from "./commands/scan";
import { createWriteCommand } from "./commands/write";
import { runCommand } from "./utils/errors";
import packageJson from "../package.json";

const program = new Command()
  .name("minimap")
  .description("Compile high-signal repository context for coding agents.")
  .version(packageJson.version);

program.addCommand(createScanCommand());
program.addCommand(createGenerateCommand());
program.addCommand(createWriteCommand());
program.addCommand(createCheckCommand());

runCommand(async () => {
  await program.parseAsync(process.argv);
});
