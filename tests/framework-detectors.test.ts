import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { scanRepo } from "../src/core/scan-repo";

const fixture = (name: string) => join(import.meta.dir, "fixtures", "frameworks", name);

describe("framework detector fixtures", () => {
  test.each([
    ["astro", { kind: "framework", name: "Astro" }],
    ["remix", { kind: "framework", name: "Remix" }],
    ["angular", { kind: "framework", name: "Angular" }],
    ["tauri", { kind: "framework", name: "Tauri" }],
    ["rails", { kind: "framework", name: "Ruby on Rails" }],
    ["django", { kind: "framework", name: "Django" }],
    ["fastapi", { kind: "framework", name: "FastAPI" }],
    ["cloudflare-workers", { kind: "tool", name: "Cloudflare Workers" }],
  ])("detects %s", async (name, expected) => {
    const scan = await scanRepo(fixture(name));

    expect(scan.signals).toContainEqual(expect.objectContaining(expected));
    expect(scan.signals.find((signal) => signal.name === expected.name)?.evidence).toBeTruthy();
  });
});
