import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { scanRepo } from "../src/core/scan-repo";
import { renderAgentContext } from "../src/renderers/render-agent-context";
import { getManagedBlock, normalizeBlock, upsertManagedBlock } from "../src/writers/managed-block";

const fixture = (name: string) => join(import.meta.dir, "fixtures", name);

describe("check behavior primitives", () => {
  test("current block matches generated block", async () => {
    const scan = await scanRepo(fixture("plain-php"));
    const block = renderAgentContext(scan);
    const content = upsertManagedBlock("# AGENTS\n", block);
    expect(normalizeBlock(getManagedBlock(content) ?? "")).toBe(normalizeBlock(block));
  });

  test("stale block differs from generated block", async () => {
    const scan = await scanRepo(fixture("plain-php"));
    const block = renderAgentContext(scan);
    const stale = block.replace("Composer", "Different tool");
    expect(normalizeBlock(stale)).not.toBe(normalizeBlock(block));
  });

  test("target fixture can be written outside source fixtures", async () => {
    const dir = await mkdtemp(join(tmpdir(), "minimap-"));
    try {
      await writeFile(join(dir, "composer.json"), '{"require":{"php":"^8.3"}}');
      const scan = await scanRepo(dir);
      expect(renderAgentContext(scan)).toContain("PHP");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
