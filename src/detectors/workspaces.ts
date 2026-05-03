import { dirname } from "node:path/posix";

import { z } from "zod";

import type { Confidence, Detector, RepoSignal } from "../core/signals";

const packageJsonSchema = z.object({
  name: z.string().optional(),
  workspaces: z
    .union([
      z.array(z.string()),
      z.object({
        packages: z.array(z.string()).optional(),
      }),
    ])
    .optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
  peerDependencies: z.record(z.string(), z.string()).optional(),
});

const lernaJsonSchema = z.object({
  packages: z.array(z.string()).optional(),
});

type WorkspaceSource = {
  source: string;
  manager: string;
  confidence: Confidence;
  evidence: string;
  patterns: string[];
};

function packageWorkspacePatterns(workspaces: z.infer<typeof packageJsonSchema>["workspaces"]) {
  if (Array.isArray(workspaces)) return workspaces;
  return workspaces?.packages ?? [];
}

function managerForPackageWorkspaces(files: { exists(path: string): boolean }): string {
  if (files.exists("bun.lock") || files.exists("bun.lockb")) return "Bun";
  if (files.exists("pnpm-lock.yaml")) return "pnpm";
  if (files.exists("yarn.lock")) return "Yarn";
  return "npm";
}

function parsePnpmWorkspacePackages(text: string): string[] {
  const patterns: string[] = [];
  const lines = text.split(/\r?\n/);
  let inPackages = false;
  let packagesIndent = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const packagesMatch = /^(\s*)packages:\s*(?:#.*)?$/.exec(line);
    if (packagesMatch) {
      inPackages = true;
      packagesIndent = packagesMatch[1]?.length ?? 0;
      continue;
    }

    if (!inPackages) continue;

    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    if (indent <= packagesIndent && !trimmed.startsWith("-")) break;

    const itemMatch = /^-\s*['"]?([^'"\s#][^'"#]*)['"]?(?:\s*#.*)?$/.exec(trimmed);
    const value = itemMatch?.[1]?.trim();
    if (value) patterns.push(value);
  }

  return patterns;
}

function manifestPattern(pattern: string): string | null {
  const normalized = pattern.trim().replaceAll("\\", "/").replace(/\/+$/, "");
  if (!normalized || normalized === "." || normalized.startsWith("!")) return null;
  if (normalized.includes("node_modules")) return null;
  if (normalized.endsWith("/package.json") || normalized === "package.json") return normalized;
  return `${normalized}/package.json`;
}

async function workspacePaths(
  files: { listFiles(patterns: string[]): Promise<string[]> },
  patterns: string[],
): Promise<Array<{ path: string; manifest: string; pattern: string }>> {
  const byPath = new Map<string, { manifest: string; pattern: string }>();

  for (const pattern of patterns) {
    const manifest = manifestPattern(pattern);
    if (!manifest) continue;
    const matches = await files.listFiles([manifest]);
    for (const match of matches) {
      if (match.includes("node_modules/")) continue;
      const path = dirname(match);
      if (path === ".") continue;
      byPath.set(path, { manifest: match, pattern });
    }
  }

  return [...byPath.entries()]
    .map(([path, workspace]) => ({ path, ...workspace }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function workspacePackageStack(pkg: z.infer<typeof packageJsonSchema>): string[] {
  const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies, pkg.peerDependencies);
  const stack: string[] = ["JavaScript"];

  const detected: Array<[string, string]> = [
    ["typescript", "TypeScript"],
    ["react", "React"],
    ["next", "Next.js"],
    ["vue", "Vue"],
    ["@remix-run/react", "Remix"],
    ["astro", "Astro"],
    ["@angular/core", "Angular"],
    ["svelte", "Svelte"],
    ["@sveltejs/kit", "SvelteKit"],
    ["vite", "Vite"],
    ["tailwindcss", "Tailwind CSS"],
    ["vitest", "Vitest"],
    ["jest", "Jest"],
  ];

  for (const [dependency, name] of detected) {
    if (deps[dependency] && !stack.includes(name)) stack.push(name);
  }

  return stack;
}

export const detectWorkspaces: Detector = async ({ files }) => {
  const signals: RepoSignal[] = [];
  const sources: WorkspaceSource[] = [];

  const rawPackageJson = await files.readJson<unknown>("package.json");
  const parsedPackageJson = packageJsonSchema.safeParse(rawPackageJson);
  const packageWorkspaces = parsedPackageJson.success
    ? packageWorkspacePatterns(parsedPackageJson.data.workspaces)
    : [];

  if (packageWorkspaces.length > 0) {
    sources.push({
      source: "package.json",
      manager: managerForPackageWorkspaces(files),
      confidence: "high",
      evidence: "package.json workspaces field present",
      patterns: packageWorkspaces,
    });
  }

  if (files.exists("pnpm-workspace.yaml")) {
    const text = (await files.readText("pnpm-workspace.yaml")) ?? "";
    const patterns = parsePnpmWorkspacePackages(text);
    sources.push({
      source: "pnpm-workspace.yaml",
      manager: "pnpm",
      confidence: "high",
      evidence: "pnpm-workspace.yaml present",
      patterns,
    });
  }

  const rawLernaJson = await files.readJson<unknown>("lerna.json");
  const parsedLernaJson = lernaJsonSchema.safeParse(rawLernaJson);
  if (parsedLernaJson.success && parsedLernaJson.data.packages?.length) {
    sources.push({
      source: "lerna.json",
      manager: "Lerna",
      confidence: "high",
      evidence: "lerna.json packages field present",
      patterns: parsedLernaJson.data.packages,
    });
  }

  const toolFiles: Array<[string, string]> = [
    ["turbo.json", "Turborepo"],
    ["nx.json", "Nx"],
    ["lerna.json", "Lerna"],
  ];

  for (const [path, name] of toolFiles) {
    if (!files.exists(path)) continue;
    signals.push({
      kind: "tool",
      name,
      confidence: "high",
      source: path,
      evidence: `${path} present`,
    });
  }

  const seenWorkspacePaths = new Set<string>();
  for (const source of sources) {
    const paths = await workspacePaths(files, source.patterns);
    if (paths.length === 0 && source.patterns.length > 0) {
      signals.push({
        kind: "architecture",
        name: "Monorepo",
        confidence: "medium",
        source: source.source,
        evidence: source.evidence,
        metadata: { manager: source.manager },
      });
      continue;
    }

    for (const workspace of paths) {
      if (seenWorkspacePaths.has(workspace.path)) continue;
      seenWorkspacePaths.add(workspace.path);
      const rawManifest = await files.readJson<unknown>(workspace.manifest);
      const parsedManifest = packageJsonSchema.safeParse(rawManifest);
      const manifest = parsedManifest.success ? parsedManifest.data : null;
      const stack = manifest ? workspacePackageStack(manifest) : [];
      signals.push({
        kind: "workspace",
        name: workspace.path,
        confidence: source.confidence,
        source: source.source,
        evidence: source.evidence,
        metadata: {
          path: workspace.path,
          manager: source.manager,
          pattern: workspace.pattern,
          ...(manifest?.name ? { packageName: manifest.name } : {}),
          ...(stack.length > 0 ? { stack } : {}),
        },
      });
    }
  }

  if (seenWorkspacePaths.size > 0) {
    signals.push({
      kind: "architecture",
      name: "Monorepo",
      confidence: "high",
      source: sources[0]?.source ?? "package.json",
      evidence: "workspace package manifests detected",
    });
  }

  return signals;
};
