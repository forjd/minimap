import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { classifyCommand } from "../src/core/command-classifier";
import { scanRepo } from "../src/core/scan-repo";

const fixture = (name: string) => join(import.meta.dir, "fixtures", name);

describe("scanRepo", () => {
  test("detects package manager priority", async () => {
    const scan = await scanRepo(fixture("mixed-node-php"));
    expect(scan.signals).toContainEqual(
      expect.objectContaining({
        kind: "package-manager",
        name: "pnpm",
        confidence: "high",
      }),
    );
  });

  test("detects Laravel", async () => {
    const scan = await scanRepo(fixture("laravel-vue-inertia"));
    expect(scan.signals).toContainEqual(
      expect.objectContaining({
        kind: "framework",
        name: "Laravel",
        confidence: "high",
      }),
    );
  });

  test("extracts package.json scripts", async () => {
    const scan = await scanRepo(fixture("node-vite-vue"));
    expect(scan.signals).toContainEqual(
      expect.objectContaining({
        kind: "command",
        name: "frontend_build",
        metadata: expect.objectContaining({ value: "npm run build" }),
      }),
    );
  });

  test("detects Node CLI applications", async () => {
    const scan = await scanRepo(fixture("node-cli"));
    expect(scan.signals).toContainEqual(
      expect.objectContaining({
        kind: "architecture",
        name: "CLI application",
        confidence: "high",
      }),
    );
    expect(scan.signals).toContainEqual(
      expect.objectContaining({
        kind: "command",
        name: "cli_dev",
        metadata: expect.objectContaining({ value: "npm run dev" }),
      }),
    );
  });

  test("extracts composer scripts", async () => {
    const scan = await scanRepo(fixture("laravel-vue-inertia"));
    expect(scan.signals).toContainEqual(
      expect.objectContaining({
        kind: "command",
        name: "php_static_analysis",
        metadata: expect.objectContaining({ value: "composer analyse" }),
      }),
    );
  });

  test("sorts signals deterministically", async () => {
    const a = await scanRepo(fixture("node-vite-vue"));
    const b = await scanRepo(fixture("node-vite-vue"));
    expect(a.signals).toEqual(b.signals);
  });
});

describe("classifyCommand", () => {
  test("classifies common commands", () => {
    expect(classifyCommand("test", "vitest")).toBe("test");
    expect(classifyCommand("typecheck", "tsc --noEmit")).toBe("typecheck");
    expect(classifyCommand("deploy", "npm publish")).toBe("dangerous");
    expect(classifyCommand("setup", "php artisan migrate --force")).toBe("dangerous");
    expect(classifyCommand("prepare", "command -v husky >/dev/null 2>&1 && husky || true")).toBe(
      "unknown",
    );
    expect(classifyCommand("format", "biome format --write .")).toBe("format");
    expect(classifyCommand("lint", "rector && pint --parallel")).toBe("lint");
    expect(classifyCommand("test:lint", "pint --parallel --test")).toBe("lint");
  });
});
