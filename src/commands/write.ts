import { Command } from "commander";

import { scanRepo } from "../core/scan-repo";
import { renderAgentContext } from "../renderers/render-agent-context";
import { parseProfile } from "../renderers/profiles";
import { ManagedBlockError, upsertManagedBlock } from "../writers/managed-block";
import {
  assertExistingTargetInside,
  ensureSafeTarget,
  resolveCwd,
  resolveTarget,
} from "../utils/paths";

export function createWriteCommand(): Command {
  return new Command("write")
    .description("Write or update a managed context block in a target file.")
    .requiredOption("--target <file>", "Target file to write, such as AGENTS.md.")
    .option("--profile <profile>", "Output profile: agents or claude.", "agents")
    .option("--dry-run", "Print resulting content without writing.")
    .option("--cwd <path>", "Repository path to scan and write within.")
    .action(
      async (options: { target: string; profile?: string; dryRun?: boolean; cwd?: string }) => {
        const cwd = resolveCwd(options.cwd);
        const profile = parseProfile(options.profile);
        const targetPath = resolveTarget(cwd, options.target);
        const targetFile = Bun.file(targetPath);
        await assertExistingTargetInside(cwd, targetPath, options.target);
        const existing = (await targetFile.exists()) ? await targetFile.text() : "";
        const block = renderAgentContext(await scanRepo(cwd), profile);

        let nextContent: string;
        try {
          nextContent = upsertManagedBlock(existing, block);
        } catch (error) {
          if (error instanceof ManagedBlockError)
            throw new Error(`${options.target}: ${error.message}`);
          throw error;
        }

        if (options.dryRun) {
          process.stdout.write(nextContent);
          return;
        }

        await ensureSafeTarget(cwd, targetPath, options.target);
        await Bun.write(targetPath, nextContent);
        console.log(`Updated ${options.target}.`);
      },
    );
}
