import { Command } from "commander";

import { scanRepo } from "../core/scan-repo";
import { renderAgentContext } from "../renderers/render-agent-context";
import { getManagedBlock, ManagedBlockError, normalizeBlock } from "../writers/managed-block";
import { simpleDiffMessage } from "../writers/diff";
import { assertExistingTargetInside, resolveCwd, resolveTarget } from "../utils/paths";

export function createCheckCommand(): Command {
  return new Command("check")
    .description("Check whether a target file has a current minimap managed block.")
    .requiredOption("--target <file>", "Target file to check, such as AGENTS.md.")
    .option("--cwd <path>", "Repository path to scan.")
    .action(async (options: { target: string; cwd?: string }) => {
      const cwd = resolveCwd(options.cwd);
      const targetPath = resolveTarget(cwd, options.target);
      const targetFile = Bun.file(targetPath);
      if (!(await targetFile.exists())) {
        console.error(`${options.target} does not exist.`);
        process.exitCode = 1;
        return;
      }

      await assertExistingTargetInside(cwd, targetPath, options.target);
      const content = await targetFile.text();
      let existingBlock: string | null;
      try {
        existingBlock = getManagedBlock(content);
      } catch (error) {
        const message = error instanceof ManagedBlockError ? error.message : String(error);
        console.error(`${options.target}: ${message}`);
        process.exitCode = 1;
        return;
      }

      if (!existingBlock) {
        console.error(`${options.target} does not contain a minimap managed block.`);
        process.exitCode = 1;
        return;
      }

      const currentBlock = renderAgentContext(await scanRepo(cwd));
      if (normalizeBlock(existingBlock) === normalizeBlock(currentBlock)) {
        console.log(`${options.target} minimap block is current.`);
        return;
      }

      console.error(simpleDiffMessage(options.target));
      process.exitCode = 1;
    });
}
