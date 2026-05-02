import { z } from "zod";

import { commandSignalName, classifyCommand, isUsefulCommand } from "../core/command-classifier";
import type { Confidence, Detector, RepoSignal } from "../core/signals";

const packageJsonSchema = z.object({
  bin: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
  keywords: z.array(z.string()).optional(),
  type: z.string().optional(),
  scripts: z.record(z.string(), z.string()).optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
  peerDependencies: z.record(z.string(), z.string()).optional(),
});

type PackageJson = z.infer<typeof packageJsonSchema>;

function depsOf(pkg: PackageJson): Record<string, string> {
  return Object.assign({}, pkg.dependencies, pkg.devDependencies, pkg.peerDependencies);
}

function scriptRunner(files: { exists(path: string): boolean }): string {
  if (files.exists("bun.lock") || files.exists("bun.lockb")) return "bun run";
  if (files.exists("pnpm-lock.yaml")) return "pnpm";
  if (files.exists("yarn.lock")) return "yarn";
  return "npm run";
}

function hasBin(pkg: PackageJson): boolean {
  if (typeof pkg.bin === "string") return pkg.bin.trim().length > 0;
  return Object.keys(pkg.bin ?? {}).length > 0;
}

function cliEvidence(pkg: PackageJson): { confidence: Confidence; evidence: string } | null {
  if (hasBin(pkg)) {
    return { confidence: "high", evidence: "bin field present" };
  }

  const keywords = new Set((pkg.keywords ?? []).map((keyword) => keyword.toLowerCase()));
  if (keywords.has("cli") || keywords.has("command-line") || keywords.has("terminal")) {
    return { confidence: "medium", evidence: "CLI keyword present" };
  }

  return null;
}

function isFrontendProject(
  deps: Record<string, string>,
  files: { exists(path: string): boolean },
): boolean {
  return Boolean(
    deps.vue ||
    deps.react ||
    deps.next ||
    deps.nuxt ||
    deps.svelte ||
    deps["@sveltejs/kit"] ||
    deps.vite ||
    files.exists("vite.config.ts") ||
    files.exists("vite.config.js"),
  );
}

export const detectNode: Detector = async ({ files }) => {
  const rawPkg = await files.readJson<unknown>("package.json");
  const parsedPkg = packageJsonSchema.safeParse(rawPkg);
  const pkg = parsedPkg.success ? parsedPkg.data : null;
  const signals: RepoSignal[] = [];
  if (!pkg) return signals;

  signals.push({
    kind: "language",
    name: "JavaScript",
    confidence: "high",
    source: "package.json",
    evidence: "package.json present",
  });

  const deps = depsOf(pkg);
  const cli = cliEvidence(pkg);
  const nodeDomain = isFrontendProject(deps, files) ? "frontend" : cli ? "cli" : "node";
  if (deps.typescript) {
    signals.push({
      kind: "language",
      name: "TypeScript",
      confidence: "high",
      source: "package.json",
      evidence: "typescript dependency detected",
    });
  }

  if (pkg.type === "module") {
    signals.push({
      kind: "convention",
      name: "ES modules",
      confidence: "high",
      source: "package.json",
      evidence: 'type is "module"',
    });
  }

  if (cli) {
    signals.push({
      kind: "architecture",
      name: "CLI application",
      confidence: cli.confidence,
      source: "package.json",
      evidence: cli.evidence,
    });
  }

  const manager: { name: string; confidence: Confidence; source: string; evidence: string } =
    files.exists("bun.lock") || files.exists("bun.lockb")
      ? {
          name: "Bun",
          confidence: "high",
          source: files.exists("bun.lock") ? "bun.lock" : "bun.lockb",
          evidence: "bun.lock present",
        }
      : files.exists("pnpm-lock.yaml")
        ? {
            name: "pnpm",
            confidence: "high",
            source: "pnpm-lock.yaml",
            evidence: "pnpm-lock.yaml present",
          }
        : files.exists("yarn.lock")
          ? { name: "Yarn", confidence: "high", source: "yarn.lock", evidence: "yarn.lock present" }
          : files.exists("package-lock.json")
            ? {
                name: "npm",
                confidence: "high",
                source: "package-lock.json",
                evidence: "package-lock.json present",
              }
            : {
                name: "npm",
                confidence: "low",
                source: "package.json",
                evidence: "package.json present",
              };

  signals.push({
    kind: "package-manager",
    name: manager.name,
    confidence: manager.confidence,
    source: manager.source,
    evidence: manager.evidence,
  });

  const runner = scriptRunner(files);
  for (const [name, value] of Object.entries(pkg.scripts ?? {})) {
    if (!isUsefulCommand(name, value)) continue;
    const category = classifyCommand(name, value);
    signals.push({
      kind: category === "dangerous" ? "risk" : "command",
      name: commandSignalName("node", name, value, nodeDomain),
      confidence: category === "dangerous" ? "high" : "medium",
      source: "package.json",
      evidence: `script "${name}": ${value}`,
      metadata: { value: `${runner} ${name}`, category, script: name },
    });
  }

  return signals;
};
