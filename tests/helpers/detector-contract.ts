import { expect } from "bun:test";
import { posix } from "node:path";

import type { Detector, RepoFileMap, RepoSignal } from "../../src/core/signals";

type VirtualFiles = Record<string, string | Record<string, unknown>>;

const validKinds = new Set<RepoSignal["kind"]>([
  "language",
  "framework",
  "tool",
  "package-manager",
  "workspace",
  "command",
  "test-framework",
  "architecture",
  "convention",
  "risk",
]);

const validConfidence = new Set<RepoSignal["confidence"]>(["high", "medium", "low"]);

function assertSafePath(path: string): void {
  expect(path).not.toBe("");
  expect(posix.isAbsolute(path)).toBe(false);
  expect(path.split("/")).not.toContain("..");
  expect(path).not.toContain("\\");
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replaceAll(/[.+^${}()|[\]\\]/g, "\\$&");
  const wildcarded = escaped.replaceAll("**", ".*").replaceAll("*", "[^/]*");
  return new RegExp(`^${wildcarded}$`);
}

function createVirtualFileMap(files: VirtualFiles, requested: string[]): RepoFileMap {
  const entries = new Map(
    Object.entries(files).map(([path, value]) => [
      path,
      typeof value === "string" ? value : JSON.stringify(value),
    ]),
  );

  return {
    exists(path) {
      assertSafePath(path);
      requested.push(path);
      return entries.has(path);
    },
    async readText(path) {
      assertSafePath(path);
      requested.push(path);
      return entries.get(path) ?? null;
    },
    async readJson(path) {
      assertSafePath(path);
      requested.push(path);
      const text = entries.get(path);
      if (!text) return null;
      return JSON.parse(text);
    },
    async listFiles(patterns) {
      for (const pattern of patterns) {
        assertSafePath(pattern);
        requested.push(pattern);
      }
      const regexes = patterns.map(globToRegExp);
      return [...entries.keys()].filter((path) => regexes.some((regex) => regex.test(path))).sort();
    },
  };
}

function expectValidSignals(signals: RepoSignal[]): void {
  expect(signals.length).toBeGreaterThan(0);
  for (const signal of signals) {
    expect(validKinds.has(signal.kind)).toBe(true);
    expect(signal.name.trim()).not.toBe("");
    expect(validConfidence.has(signal.confidence)).toBe(true);
    expect(signal.source.trim()).not.toBe("");
    expect(signal.evidence.trim()).not.toBe("");
    assertSafePath(signal.source);
  }
}

export async function expectDetectorContract(detector: Detector, files: VirtualFiles) {
  const firstRequests: string[] = [];
  const secondRequests: string[] = [];
  const firstWarnings: string[] = [];
  const secondWarnings: string[] = [];

  const first = await detector({
    cwd: "/virtual/repo",
    files: createVirtualFileMap(files, firstRequests),
    warnings: firstWarnings,
  });
  const second = await detector({
    cwd: "/virtual/repo",
    files: createVirtualFileMap(files, secondRequests),
    warnings: secondWarnings,
  });

  expect(first).toEqual(second);
  expect(firstRequests).toEqual(secondRequests);
  expect(firstWarnings).toEqual(secondWarnings);
  expectValidSignals(first);
}
