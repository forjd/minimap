#!/usr/bin/env bun
import { Command } from "commander";

import { createCheckCommand } from "./commands/check";
import { createGenerateCommand } from "./commands/generate";
import { createScanCommand } from "./commands/scan";
import { createWriteCommand } from "./commands/write";
import { runCommand } from "./utils/errors";

const program = new Command()
  .name("minimap")
  .description("Compile high-signal repository context for coding agents.")
  .version("0.1.0");

program.addCommand(createScanCommand());
program.addCommand(createGenerateCommand());
program.addCommand(createWriteCommand());
program.addCommand(createCheckCommand());

runCommand(async () => {
  await program.parseAsync(process.argv);
});
