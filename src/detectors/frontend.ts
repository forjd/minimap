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
    ["@remix-run/react", "Remix", "framework", "@remix-run/react dependency detected"],
    ["astro", "Astro", "framework", "astro dependency detected"],
    ["solid-js", "Solid", "framework", "solid-js dependency detected"],
    ["@angular/core", "Angular", "framework", "@angular/core dependency detected"],
    ["svelte", "Svelte", "framework", "svelte dependency detected"],
    ["@sveltejs/kit", "SvelteKit", "framework", "@sveltejs/kit dependency detected"],
    ["express", "Express", "framework", "express dependency detected"],
    ["fastify", "Fastify", "framework", "fastify dependency detected"],
    ["hono", "Hono", "framework", "hono dependency detected"],
    ["@nestjs/core", "NestJS", "framework", "@nestjs/core dependency detected"],
    ["vite", "Vite", "tool", "vite dependency detected"],
    ["tailwindcss", "Tailwind CSS", "tool", "tailwindcss dependency detected"],
    ["prisma", "Prisma", "tool", "prisma dependency detected"],
    ["drizzle-orm", "Drizzle ORM", "tool", "drizzle-orm dependency detected"],
    ["storybook", "Storybook", "tool", "storybook dependency detected"],
    ["@storybook/react", "Storybook", "tool", "@storybook/react dependency detected"],
    ["@storybook/vue3", "Storybook", "tool", "@storybook/vue3 dependency detected"],
    ["prettier", "Prettier", "tool", "prettier dependency detected"],
    ["eslint", "ESLint", "tool", "eslint dependency detected"],
    ["oxlint", "oxlint", "tool", "oxlint dependency detected"],
    ["oxfmt", "oxfmt", "tool", "oxfmt dependency detected"],
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

  if (
    files.exists("eslint.config.js") ||
    files.exists(".eslintrc.json") ||
    files.exists(".eslintrc.js")
  ) {
    signals.push({
      kind: "tool",
      name: "ESLint",
      confidence: "medium",
      source: files.exists("eslint.config.js")
        ? "eslint.config.js"
        : files.exists(".eslintrc.json")
          ? ".eslintrc.json"
          : ".eslintrc.js",
      evidence: "ESLint config present",
    });
  }

  if (files.exists(".prettierrc") || files.exists("prettier.config.js")) {
    signals.push({
      kind: "tool",
      name: "Prettier",
      confidence: "medium",
      source: files.exists(".prettierrc") ? ".prettierrc" : "prettier.config.js",
      evidence: "Prettier config present",
    });
  }

  return signals;
};
