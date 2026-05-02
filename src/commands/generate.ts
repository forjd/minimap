import { Command } from "commander";

import { scanRepo } from "../core/scan-repo";
import { renderAgentContext } from "../renderers/render-agent-context";
import { parseProfile } from "../renderers/profiles";
import { resolveCwd } from "../utils/paths";

export function createGenerateCommand(): Command {
  return new Command("generate")
    .description("Generate the managed agent context block.")
    .option("--profile <profile>", "Output profile: agents or claude.", "agents")
    .option("--format <format>", "Output format. Markdown is the only MVP format.", "markdown")
    .option("--cwd <path>", "Repository path to scan.")
    .action(async (options: { profile?: string; format?: string; cwd?: string }) => {
      parseProfile(options.profile);
      if (options.format !== "markdown") {
        throw new Error(`Unsupported format "${options.format}". Expected markdown.`);
      }
      const scan = await scanRepo(resolveCwd(options.cwd));
      process.stdout.write(renderAgentContext(scan));
    });
}
