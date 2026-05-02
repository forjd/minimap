import { describe, expect, test } from "bun:test";

import { detectCi } from "../src/detectors/ci";

describe("detectCi", () => {
  test("detects GitHub Actions workflows and names", async () => {
    const signals = await detectCi({
      cwd: "/repo",
      warnings: [],
      files: {
        exists: () => false,
        readJson: async () => null,
        readText: async (path) => (path === ".github/workflows/test.yml" ? 'name: "CI"\n' : null),
        listFiles: async () => [".github/workflows/test.yml"],
      },
    });

    expect(signals).toContainEqual(
      expect.objectContaining({
        kind: "tool",
        name: "GitHub Actions",
        source: ".github/workflows",
      }),
    );
    expect(signals).toContainEqual(
      expect.objectContaining({
        kind: "convention",
        name: "CI workflow: CI",
        source: ".github/workflows/test.yml",
      }),
    );
  });

  test("returns no signals when workflows are absent", async () => {
    const signals = await detectCi({
      cwd: "/repo",
      warnings: [],
      files: {
        exists: () => false,
        readJson: async () => null,
        readText: async () => null,
        listFiles: async () => [],
      },
    });

    expect(signals).toEqual([]);
  });
});
