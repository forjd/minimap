import { Command } from "commander";

import { scanRepo } from "../core/scan-repo";
import { printJson } from "../utils/json";
import { resolveCwd } from "../utils/paths";

export function createScanCommand(): Command {
  return new Command("scan")
    .description("Scan a repository and print detected signals as JSON.")
    .option("--json", "Print compact JSON.")
    .option("--pretty", "Print pretty JSON.")
    .option("--cwd <path>", "Repository path to scan.")
    .action(async (options: { json?: boolean; pretty?: boolean; cwd?: string }) => {
      const scan = await scanRepo(resolveCwd(options.cwd));
      printJson(scan, options.pretty || !options.json);
    });
}
