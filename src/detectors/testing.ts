import { z } from "zod";

import type { Detector, RepoSignal } from "../core/signals";

const packageJsonSchema = z.object({
  scripts: z.record(z.string(), z.string()).optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
  peerDependencies: z.record(z.string(), z.string()).optional(),
});

type PackageJson = z.infer<typeof packageJsonSchema>;

function depsOf(pkg: PackageJson): Record<string, string> {
  return Object.assign({}, pkg.dependencies, pkg.devDependencies, pkg.peerDependencies);
}

export const detectTesting: Detector = async ({ files }) => {
  const rawPkg = await files.readJson<unknown>("package.json");
  const parsedPkg = packageJsonSchema.safeParse(rawPkg);
  const pkg = parsedPkg.success ? parsedPkg.data : null;
  const deps = pkg ? depsOf(pkg) : {};
  const signals: RepoSignal[] = [];

  const testFrameworks: Array<[string, string]> = [
    ["vitest", "Vitest"],
    ["jest", "Jest"],
    ["mocha", "Mocha"],
    ["ava", "Ava"],
    ["playwright", "Playwright"],
    ["@playwright/test", "Playwright"],
    ["cypress", "Cypress"],
    ["@testing-library/react", "Testing Library"],
    ["@testing-library/vue", "Testing Library"],
    ["@testing-library/svelte", "Testing Library"],
  ];

  for (const [dependency, name] of testFrameworks) {
    if (deps[dependency]) {
      signals.push({
        kind: "test-framework",
        name,
        confidence: "high",
        source: "package.json",
        evidence: `${dependency} dependency detected`,
      });
    }
  }

  if (files.exists("phpunit.xml") || files.exists("phpunit.xml.dist")) {
    signals.push({
      kind: "test-framework",
      name: "PHPUnit",
      confidence: "medium",
      source: files.exists("phpunit.xml") ? "phpunit.xml" : "phpunit.xml.dist",
      evidence: "PHPUnit config present",
    });
  }

  if (files.exists("pest.php")) {
    signals.push({
      kind: "test-framework",
      name: "Pest",
      confidence: "medium",
      source: "pest.php",
      evidence: "pest.php present",
    });
  }

  if (Object.values(pkg?.scripts ?? {}).some((script) => /\bbun\s+test\b/.test(script))) {
    signals.push({
      kind: "test-framework",
      name: "Bun test",
      confidence: "medium",
      source: "package.json",
      evidence: "bun test script detected",
    });
  }

  return signals;
};
