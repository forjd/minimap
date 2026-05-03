import { afterEach, describe, expect, test } from "bun:test";
import type { Command } from "commander";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createCheckCommand } from "../src/commands/check";
import { createGenerateCommand } from "../src/commands/generate";
import { createScanCommand } from "../src/commands/scan";
import { createWriteCommand } from "../src/commands/write";
import { scanRepo } from "../src/core/scan-repo";
import { renderAgentContext } from "../src/renderers/render-agent-context";
import { upsertManagedBlock } from "../src/writers/managed-block";

const fixture = (name: string) => join(import.meta.dir, "fixtures", name);

async function withCapturedOutput(
  action: () => Promise<void>,
): Promise<{ stdout: string; stderr: string; exitCode: typeof process.exitCode }> {
  const stdoutWrite = process.stdout.write;
  const stderrWrite = process.stderr.write;
  const consoleLog = console.log;
  const consoleError = console.error;
  const previousExitCode = process.exitCode;
  let stdout = "";
  let stderr = "";

  process.exitCode = 0;
  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdout += chunk.toString();
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr += chunk.toString();
    return true;
  }) as typeof process.stderr.write;
  console.log = (...args: unknown[]) => {
    stdout += `${args.join(" ")}\n`;
  };
  console.error = (...args: unknown[]) => {
    stderr += `${args.join(" ")}\n`;
  };

  try {
    await action();
    return { stdout, stderr, exitCode: process.exitCode };
  } finally {
    process.stdout.write = stdoutWrite;
    process.stderr.write = stderrWrite;
    console.log = consoleLog;
    console.error = consoleError;
    process.exitCode = previousExitCode;
  }
}

async function parseCommand(command: Command, args: string[]) {
  command.exitOverride();
  await command.parseAsync(args, { from: "user" });
}

afterEach(() => {
  process.exitCode = 0;
});

describe("commands", () => {
  test("scan prints compact JSON", async () => {
    const result = await withCapturedOutput(async () => {
      await parseCommand(createScanCommand(), ["--cwd", fixture("node-vite-vue"), "--json"]);
    });

    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(
      expect.objectContaining({
        cwd: fixture("node-vite-vue"),
        signals: expect.arrayContaining([
          expect.objectContaining({ kind: "framework", name: "Vue" }),
        ]),
      }),
    );
  });

  test("generate rejects unsupported formats", async () => {
    const result = await withCapturedOutput(async () => {
      await expect(
        parseCommand(createGenerateCommand(), ["--cwd", fixture("plain-php"), "--format", "xml"]),
      ).rejects.toThrow('Unsupported format "xml". Expected markdown.');
    });

    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });

  test("generate rejects unsupported profiles", async () => {
    const result = await withCapturedOutput(async () => {
      await expect(
        parseCommand(createGenerateCommand(), [
          "--cwd",
          fixture("plain-php"),
          "--profile",
          "unknown",
        ]),
      ).rejects.toThrow('Unsupported profile "unknown". Expected one of: agents, claude.');
    });

    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });

  test("generate uses claude profile", async () => {
    const result = await withCapturedOutput(async () => {
      await parseCommand(createGenerateCommand(), [
        "--cwd",
        fixture("node-cli"),
        "--profile",
        "claude",
      ]);
    });

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain('profile="claude"');
  });

  test("write dry-run prints the target content without writing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "minimap-command-"));
    try {
      await writeFile(join(dir, "composer.json"), '{"require":{"php":"^8.3"}}');
      const result = await withCapturedOutput(async () => {
        await parseCommand(createWriteCommand(), [
          "--cwd",
          dir,
          "--target",
          "AGENTS.md",
          "--dry-run",
        ]);
      });

      expect(result.stderr).toBe("");
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("<!-- minimap:start -->");
      expect(await Bun.file(join(dir, "AGENTS.md")).exists()).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("write creates parent directories and writes the target", async () => {
    const dir = await mkdtemp(join(tmpdir(), "minimap-command-"));
    try {
      await writeFile(join(dir, "composer.json"), '{"require":{"php":"^8.3"}}');
      const result = await withCapturedOutput(async () => {
        await parseCommand(createWriteCommand(), ["--cwd", dir, "--target", "docs/AGENTS.md"]);
      });

      expect(result.stderr).toBe("");
      expect(result.stdout).toBe("Updated docs/AGENTS.md.\n");
      expect(await Bun.file(join(dir, "docs", "AGENTS.md")).text()).toContain(
        "<!-- minimap:start -->",
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("write rejects targets outside the repository", async () => {
    const dir = await mkdtemp(join(tmpdir(), "minimap-command-"));
    try {
      await writeFile(join(dir, "composer.json"), '{"require":{"php":"^8.3"}}');

      await expect(
        parseCommand(createWriteCommand(), ["--cwd", dir, "--target", "../AGENTS.md"]),
      ).rejects.toThrow("Refusing to target outside repository: ../AGENTS.md");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("write rejects symlinked target files outside the repository", async () => {
    const dir = await mkdtemp(join(tmpdir(), "minimap-command-"));
    const outsideDir = await mkdtemp(join(tmpdir(), "minimap-outside-"));
    try {
      await writeFile(join(dir, "composer.json"), '{"require":{"php":"^8.3"}}');
      await writeFile(join(outsideDir, "AGENTS.md"), "# Outside\n");
      await symlink(join(outsideDir, "AGENTS.md"), join(dir, "AGENTS.md"));

      await expect(
        parseCommand(createWriteCommand(), ["--cwd", dir, "--target", "AGENTS.md"]),
      ).rejects.toThrow("Refusing to target outside repository: AGENTS.md");
    } finally {
      await rm(dir, { recursive: true, force: true });
      await rm(outsideDir, { recursive: true, force: true });
    }
  });

  test("write rejects symlinked target directories outside the repository", async () => {
    const dir = await mkdtemp(join(tmpdir(), "minimap-command-"));
    const outsideDir = await mkdtemp(join(tmpdir(), "minimap-outside-"));
    try {
      await writeFile(join(dir, "composer.json"), '{"require":{"php":"^8.3"}}');
      await mkdir(join(outsideDir, "docs"));
      await symlink(join(outsideDir, "docs"), join(dir, "docs"));

      await expect(
        parseCommand(createWriteCommand(), ["--cwd", dir, "--target", "docs/AGENTS.md"]),
      ).rejects.toThrow("Refusing to target outside repository: docs/AGENTS.md");
      expect(await Bun.file(join(outsideDir, "docs", "AGENTS.md")).exists()).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
      await rm(outsideDir, { recursive: true, force: true });
    }
  });

  test("write reports duplicate managed blocks", async () => {
    const dir = await mkdtemp(join(tmpdir(), "minimap-command-"));
    try {
      await writeFile(join(dir, "composer.json"), '{"require":{"php":"^8.3"}}');
      await writeFile(
        join(dir, "AGENTS.md"),
        "<!-- minimap:start -->\none\n<!-- minimap:end -->\n<!-- minimap:start -->\ntwo\n<!-- minimap:end -->\n",
      );

      const result = await withCapturedOutput(async () => {
        await expect(
          parseCommand(createWriteCommand(), ["--cwd", dir, "--target", "AGENTS.md"]),
        ).rejects.toThrow("AGENTS.md: Multiple minimap managed blocks found.");
      });

      expect(result.stdout).toBe("");
      expect(result.stderr).toBe("");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("check reports missing targets", async () => {
    const result = await withCapturedOutput(async () => {
      await parseCommand(createCheckCommand(), [
        "--cwd",
        fixture("plain-php"),
        "--target",
        "AGENTS.md",
      ]);
    });

    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("AGENTS.md does not exist.\n");
    expect(result.exitCode).toBe(1);
  });

  test("check reports targets without managed blocks", async () => {
    const dir = await mkdtemp(join(tmpdir(), "minimap-command-"));
    try {
      await writeFile(join(dir, "composer.json"), '{"require":{"php":"^8.3"}}');
      await writeFile(join(dir, "AGENTS.md"), "# Notes\n");

      const result = await withCapturedOutput(async () => {
        await parseCommand(createCheckCommand(), ["--cwd", dir, "--target", "AGENTS.md"]);
      });

      expect(result.stdout).toBe("");
      expect(result.stderr).toBe("AGENTS.md does not contain a minimap managed block.\n");
      expect(result.exitCode).toBe(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("check reports duplicate managed blocks", async () => {
    const dir = await mkdtemp(join(tmpdir(), "minimap-command-"));
    try {
      await writeFile(join(dir, "composer.json"), '{"require":{"php":"^8.3"}}');
      await writeFile(
        join(dir, "AGENTS.md"),
        "<!-- minimap:start -->\none\n<!-- minimap:end -->\n<!-- minimap:start -->\ntwo\n<!-- minimap:end -->\n",
      );

      const result = await withCapturedOutput(async () => {
        await parseCommand(createCheckCommand(), ["--cwd", dir, "--target", "AGENTS.md"]);
      });

      expect(result.stdout).toBe("");
      expect(result.stderr).toBe("AGENTS.md: Multiple minimap managed blocks found.\n");
      expect(result.exitCode).toBe(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("check reports current managed blocks", async () => {
    const dir = await mkdtemp(join(tmpdir(), "minimap-command-"));
    try {
      await writeFile(join(dir, "composer.json"), '{"require":{"php":"^8.3"}}');
      const block = renderAgentContext(await scanRepo(dir));
      await writeFile(join(dir, "AGENTS.md"), upsertManagedBlock("# AGENTS\n", block));

      const result = await withCapturedOutput(async () => {
        await parseCommand(createCheckCommand(), ["--cwd", dir, "--target", "AGENTS.md"]);
      });

      expect(result.stdout).toBe("AGENTS.md minimap block is current.\n");
      expect(result.stderr).toBe("");
      expect(result.exitCode).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("check normalized mode ignores line ending drift", async () => {
    const dir = await mkdtemp(join(tmpdir(), "minimap-command-"));
    try {
      await writeFile(join(dir, "composer.json"), '{"require":{"php":"^8.3"}}');
      const block = renderAgentContext(await scanRepo(dir));
      const content = upsertManagedBlock("# AGENTS\n", block).replaceAll("\n", "\r\n");
      await writeFile(join(dir, "AGENTS.md"), content);

      const exact = await withCapturedOutput(async () => {
        await parseCommand(createCheckCommand(), ["--cwd", dir, "--target", "AGENTS.md"]);
      });
      expect(exact.stderr).toContain("AGENTS.md minimap block is stale.");
      expect(exact.exitCode).toBe(1);

      const normalized = await withCapturedOutput(async () => {
        await parseCommand(createCheckCommand(), [
          "--cwd",
          dir,
          "--target",
          "AGENTS.md",
          "--normalized",
        ]);
      });
      expect(normalized.stdout).toBe("AGENTS.md minimap block is current.\n");
      expect(normalized.stderr).toBe("");
      expect(normalized.exitCode).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("check reports stale managed blocks", async () => {
    const dir = await mkdtemp(join(tmpdir(), "minimap-command-"));
    try {
      await writeFile(join(dir, "composer.json"), '{"require":{"php":"^8.3"}}');
      const block = renderAgentContext(await scanRepo(dir)).replace("Composer", "Stale");
      await writeFile(join(dir, "AGENTS.md"), upsertManagedBlock("# AGENTS\n", block));

      const result = await withCapturedOutput(async () => {
        await parseCommand(createCheckCommand(), ["--cwd", dir, "--target", "AGENTS.md"]);
      });

      expect(result.stdout).toBe("");
      expect(result.stderr).toContain(
        "AGENTS.md minimap block is stale. Run `minimap write --target AGENTS.md` to update it.\n",
      );
      expect(result.stderr).toContain("Diff (current -> expected):\n@@ line ");
      expect(result.stderr).toContain("-    PHP project using Stale.");
      expect(result.stderr).toContain("+    PHP project using Composer.");
      expect(result.exitCode).toBe(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
