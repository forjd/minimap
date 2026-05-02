import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createRepoFileMap } from "../src/core/file-reader";

async function withTempRepo(action: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "minimap-files-"));
  try {
    await action(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("createRepoFileMap", () => {
  test("returns null for missing files", async () => {
    await withTempRepo(async (dir) => {
      const files = createRepoFileMap(dir, new Set(), []);
      expect(await files.readText("missing.txt")).toBeNull();
    });
  });

  test("refuses to read outside the repository", async () => {
    await withTempRepo(async (dir) => {
      const files = createRepoFileMap(dir, new Set(), []);
      expect(() => files.exists("../outside.txt")).toThrow(
        "Refusing to read outside repository: ../outside.txt",
      );
    });
  });

  test("records invalid JSON warnings", async () => {
    await withTempRepo(async (dir) => {
      const warnings: string[] = [];
      const files = createRepoFileMap(dir, new Set(), warnings);
      await writeFile(join(dir, "package.json"), "{bad json");

      expect(await files.readJson("package.json")).toBeNull();
      expect(warnings[0]).toStartWith("Could not parse package.json:");
    });
  });

  test("skips oversized files", async () => {
    await withTempRepo(async (dir) => {
      const warnings: string[] = [];
      const filesRead = new Set<string>();
      const files = createRepoFileMap(dir, filesRead, warnings);
      await writeFile(join(dir, "large.txt"), "x".repeat(256_001));

      expect(await files.readText("large.txt")).toBeNull();
      expect(filesRead.has("large.txt")).toBe(false);
      expect(warnings).toEqual(["Skipped large.txt: file is larger than 256000 bytes."]);
    });
  });
});
