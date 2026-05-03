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

  test("detects additional ecosystems and infrastructure", async () => {
    const scan = await scanRepo(fixture("expanded-ecosystems"));
    const expectedSignals = [
      { kind: "language", name: "Python" },
      { kind: "language", name: "Rust" },
      { kind: "language", name: "Go" },
      { kind: "language", name: "Ruby" },
      { kind: "language", name: "Java" },
      { kind: "language", name: "C#" },
      { kind: "framework", name: "FastAPI" },
      { kind: "framework", name: "Axum" },
      { kind: "framework", name: "Gin" },
      { kind: "framework", name: "Ruby on Rails" },
      { kind: "framework", name: "Spring Boot" },
      { kind: "framework", name: "ASP.NET Core" },
      { kind: "tool", name: "Docker" },
      { kind: "tool", name: "Docker Compose" },
      { kind: "tool", name: "Cloudflare Workers" },
      { kind: "tool", name: "Kubernetes" },
      { kind: "package-manager", name: "uv" },
      { kind: "package-manager", name: "Cargo" },
      { kind: "package-manager", name: "Go modules" },
      { kind: "package-manager", name: "Bundler" },
      { kind: "package-manager", name: "Maven" },
      { kind: "package-manager", name: ".NET SDK" },
    ];

    for (const expected of expectedSignals) {
      expect(scan.signals).toContainEqual(expect.objectContaining(expected));
    }
    expect(scan.signals).toContainEqual(
      expect.objectContaining({
        kind: "command",
        name: "python_tests",
        metadata: expect.objectContaining({ value: "uv run pytest", category: "test" }),
      }),
    );
    expect(scan.signals).toContainEqual(
      expect.objectContaining({
        kind: "command",
        name: "python_lint",
        metadata: expect.objectContaining({ value: "uv run ruff check .", category: "lint" }),
      }),
    );
    expect(scan.signals).toContainEqual(
      expect.objectContaining({
        kind: "command",
        name: "python_typecheck",
        metadata: expect.objectContaining({ value: "uv run mypy .", category: "typecheck" }),
      }),
    );
    expect(scan.signals).toContainEqual(
      expect.objectContaining({
        kind: "command",
        name: "rust_tests",
        metadata: expect.objectContaining({ value: "cargo test", category: "test" }),
      }),
    );
    expect(scan.signals).toContainEqual(
      expect.objectContaining({
        kind: "command",
        name: "go_tests",
        metadata: expect.objectContaining({ value: "go test ./...", category: "test" }),
      }),
    );
    expect(scan.signals).toContainEqual(
      expect.objectContaining({
        kind: "command",
        name: "ruby_tests",
        metadata: expect.objectContaining({ value: "bundle exec rspec", category: "test" }),
      }),
    );
    expect(scan.signals).toContainEqual(
      expect.objectContaining({
        kind: "command",
        name: "java_tests",
        metadata: expect.objectContaining({ value: "mvn test", category: "test" }),
      }),
    );
    expect(scan.signals).toContainEqual(
      expect.objectContaining({
        kind: "command",
        name: "dotnet_tests",
        metadata: expect.objectContaining({ value: "dotnet test", category: "test" }),
      }),
    );
  });

  test("detects Swift packages and SwiftUI", async () => {
    const scan = await scanRepo(fixture("swift-package"));
    expect(scan.signals).toContainEqual(
      expect.objectContaining({ kind: "language", name: "Swift" }),
    );
    expect(scan.signals).toContainEqual(
      expect.objectContaining({ kind: "package-manager", name: "SwiftPM" }),
    );
    expect(scan.signals).toContainEqual(
      expect.objectContaining({ kind: "framework", name: "SwiftUI" }),
    );
  });

  test("does not warn for infrastructure-only repositories", async () => {
    const scan = await scanRepo(fixture("infra-only"));
    expect(scan.signals).toContainEqual(expect.objectContaining({ kind: "tool", name: "Make" }));
    expect(scan.warnings).toEqual([]);
  });

  test("detects documentation, Codex skills, and plugins", async () => {
    const scan = await scanRepo(fixture("docs-skill-plugin"));
    expect(scan.signals).toContainEqual(
      expect.objectContaining({ kind: "language", name: "Markdown" }),
    );
    expect(scan.signals).toContainEqual(
      expect.objectContaining({ kind: "architecture", name: "Codex skill" }),
    );
    expect(scan.signals).toContainEqual(
      expect.objectContaining({ kind: "architecture", name: "Codex plugin" }),
    );
    expect(scan.warnings).toEqual([]);
  });

  test("detects C and C++ projects", async () => {
    const scan = await scanRepo(fixture("c-cpp"));
    expect(scan.signals).toContainEqual(expect.objectContaining({ kind: "language", name: "C" }));
    expect(scan.signals).toContainEqual(expect.objectContaining({ kind: "language", name: "C++" }));
    expect(scan.signals).toContainEqual(expect.objectContaining({ kind: "tool", name: "CMake" }));
  });

  test("detects workspace package manifests", async () => {
    const scan = await scanRepo(fixture("pnpm-monorepo"));
    expect(scan.signals).toContainEqual(
      expect.objectContaining({ kind: "architecture", name: "Monorepo" }),
    );
    expect(scan.signals).toContainEqual(
      expect.objectContaining({ kind: "tool", name: "Turborepo" }),
    );
    expect(scan.signals).toContainEqual(
      expect.objectContaining({
        kind: "workspace",
        name: "apps/web",
        metadata: expect.objectContaining({
          manager: "pnpm",
          path: "apps/web",
          stack: ["JavaScript", "React", "Vite"],
        }),
      }),
    );
    expect(scan.signals).toContainEqual(
      expect.objectContaining({
        kind: "workspace",
        name: "packages/ui",
        metadata: expect.objectContaining({
          manager: "pnpm",
          path: "packages/ui",
          stack: ["JavaScript", "React"],
        }),
      }),
    );
  });
});

describe("classifyCommand", () => {
  test("classifies common commands", () => {
    expect(classifyCommand("test", "vitest")).toBe("test");
    expect(classifyCommand("typecheck", "tsc --noEmit")).toBe("typecheck");
    expect(classifyCommand("deploy", "npm publish")).toBe("dangerous");
    expect(classifyCommand("setup", "php artisan migrate --force")).toBe("dangerous");
    expect(classifyCommand("db:reset", "prisma migrate reset --force")).toBe("dangerous");
    expect(classifyCommand("migrate", "prisma migrate deploy")).toBe("dangerous");
    expect(classifyCommand("db:reset", "rails db:reset")).toBe("dangerous");
    expect(classifyCommand("db:drop", "bundle exec rake db:drop")).toBe("dangerous");
    expect(classifyCommand("k8s:clean", "kubectl delete namespace preview")).toBe("dangerous");
    expect(classifyCommand("infra:destroy", "terraform destroy -auto-approve")).toBe("dangerous");
    expect(classifyCommand("volumes:prune", "docker volume prune --force")).toBe("dangerous");
    expect(classifyCommand("prepare", "command -v husky >/dev/null 2>&1 && husky || true")).toBe(
      "unknown",
    );
    expect(classifyCommand("format", "biome format --write .")).toBe("format");
    expect(classifyCommand("lint", "rector && pint --parallel")).toBe("lint");
    expect(classifyCommand("test:lint", "pint --parallel --test")).toBe("lint");
  });
});
