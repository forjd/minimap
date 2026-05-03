import { Command } from "commander";

import { scanRepo } from "../core/scan-repo";
import { renderAgentContext } from "../renderers/render-agent-context";
import { parsePositiveIntegerOption, parseProfile } from "../renderers/profiles";
import { getManagedBlock, ManagedBlockError, normalizeBlock } from "../writers/managed-block";
import { compactDiffMessage } from "../writers/diff";
import { assertExistingTargetInside, resolveCwd, resolveTarget } from "../utils/paths";

export function createCheckCommand(): Command {
  return new Command("check")
    .description("Check whether a target file has a current minimap managed block.")
    .requiredOption("--target <file>", "Target file to check, such as AGENTS.md.")
    .option("--profile <profile>", "Output profile: agents or claude.", "agents")
    .option("--evidence-limit <count>", "Maximum rendered evidence items.")
    .option("--workspace-limit <count>", "Maximum rendered workspace entries.")
    .option("--normalized", "Ignore line ending and outer whitespace differences.")
    .option("--cwd <path>", "Repository path to scan.")
    .action(
      async (options: {
        target: string;
        profile?: string;
        evidenceLimit?: string;
        workspaceLimit?: string;
        normalized?: boolean;
        cwd?: string;
      }) => {
        const cwd = resolveCwd(options.cwd);
        const profile = parseProfile(options.profile);
        const evidenceLimit = parsePositiveIntegerOption("evidence limit", options.evidenceLimit);
        const workspaceLimit = parsePositiveIntegerOption(
          "workspace limit",
          options.workspaceLimit,
        );
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

        const currentBlock = renderAgentContext(await scanRepo(cwd), profile, {
          evidenceLimit,
          workspaceLimit,
        }).trimEnd();
        const blocksMatch = options.normalized
          ? normalizeBlock(existingBlock) === normalizeBlock(currentBlock)
          : existingBlock === currentBlock;

        if (blocksMatch) {
          console.log(`${options.target} minimap block is current.`);
          return;
        }

        console.error(
          compactDiffMessage(
            options.target,
            options.normalized ? normalizeBlock(existingBlock) : existingBlock,
            options.normalized ? normalizeBlock(currentBlock) : currentBlock,
          ),
        );
        process.exitCode = 1;
      },
    );
}
