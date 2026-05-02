import { z } from "zod";

import type { Detector, RepoSignal } from "../core/signals";

const packageJsonSchema = z.object({
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
  peerDependencies: z.record(z.string(), z.string()).optional(),
});

type PackageJson = z.infer<typeof packageJsonSchema>;

function depsOf(pkg: PackageJson): Record<string, string> {
  return Object.assign({}, pkg.dependencies, pkg.devDependencies, pkg.peerDependencies);
}

export const detectFrontend: Detector = async ({ files }) => {
  const rawPkg = await files.readJson<unknown>("package.json");
  const parsedPkg = packageJsonSchema.safeParse(rawPkg);
  const pkg = parsedPkg.success ? parsedPkg.data : null;
  if (!pkg) return [];
  const deps = depsOf(pkg);
  const signals: RepoSignal[] = [];

  const tools: Array<[string, string, RepoSignal["kind"], string]> = [
    ["vue", "Vue", "framework", "vue dependency detected"],
    ["@inertiajs/vue3", "Inertia", "tool", "@inertiajs/vue3 dependency detected"],
    ["react", "React", "framework", "react dependency detected"],
    ["next", "Next.js", "framework", "next dependency detected"],
    ["nuxt", "Nuxt", "framework", "nuxt dependency detected"],
    ["svelte", "Svelte", "framework", "svelte dependency detected"],
    ["@sveltejs/kit", "SvelteKit", "framework", "@sveltejs/kit dependency detected"],
    ["vite", "Vite", "tool", "vite dependency detected"],
    ["tailwindcss", "Tailwind CSS", "tool", "tailwindcss dependency detected"],
    ["eslint", "ESLint", "tool", "eslint dependency detected"],
    ["oxlint", "oxlint", "tool", "oxlint dependency detected"],
    ["@biomejs/biome", "Biome", "tool", "@biomejs/biome dependency detected"],
    ["biome", "Biome", "tool", "biome dependency detected"],
  ];

  for (const [dependency, name, kind, evidence] of tools) {
    if (deps[dependency]) {
      signals.push({
        kind,
        name,
        confidence: "high",
        source: "package.json",
        evidence,
      });
    }
  }

  if (files.exists("vite.config.ts") || files.exists("vite.config.js")) {
    signals.push({
      kind: "tool",
      name: "Vite",
      confidence: "medium",
      source: files.exists("vite.config.ts") ? "vite.config.ts" : "vite.config.js",
      evidence: "Vite config present",
    });
  }

  if (files.exists("tailwind.config.ts") || files.exists("tailwind.config.js")) {
    signals.push({
      kind: "tool",
      name: "Tailwind CSS",
      confidence: "medium",
      source: files.exists("tailwind.config.ts") ? "tailwind.config.ts" : "tailwind.config.js",
      evidence: "Tailwind config present",
    });
  }

  return signals;
};
