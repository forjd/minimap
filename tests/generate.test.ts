import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { scanRepo } from "../src/core/scan-repo";
import type { RepoScan, RepoSignal } from "../src/core/signals";
import { renderAgentContext } from "../src/renderers/render-agent-context";

const fixture = (name: string) => join(import.meta.dir, "fixtures", name);
const repositoryRoot = join(import.meta.dir, "..");

describe("renderAgentContext", () => {
  test("renders node vite vue snapshot", async () => {
    const scan = await scanRepo(fixture("node-vite-vue"));
    expect(renderAgentContext(scan)).toMatchSnapshot();
  });

  test("renders node cli snapshot", async () => {
    const scan = await scanRepo(fixture("node-cli"));
    expect(renderAgentContext(scan)).toMatchSnapshot();
  });

  test("renders laravel vue inertia snapshot", async () => {
    const scan = await scanRepo(fixture("laravel-vue-inertia"));
    expect(renderAgentContext(scan)).toMatchSnapshot();
  });

  test("renders claude profile metadata", async () => {
    const scan = await scanRepo(fixture("node-cli"));
    const context = renderAgentContext(scan, "claude");
    expect(context).toContain(
      '<repo_context generated_by="minimap" schema_version="1" profile="claude">',
    );
  });

  test("renders this repository AGENTS.md managed block snapshot", async () => {
    const scan = await scanRepo(repositoryRoot);
    expect(renderAgentContext(scan)).toMatchSnapshot();
  });

  test("summarizes expanded ecosystem projects", async () => {
    const scan = await scanRepo(fixture("expanded-ecosystems"));
    expect(renderAgentContext(scan)).toContain(
      "FastAPI + Ruby on Rails + Spring Boot + ASP.NET Core + Python + Rust + Go + Ruby + Java + C# project using Docker, Docker Compose, Cargo, Go modules, uv, .NET SDK.",
    );
  });

  test("renders workspace package manifests", async () => {
    const scan = await scanRepo(fixture("pnpm-monorepo"));
    const context = renderAgentContext(scan);
    expect(context).toContain("<workspaces>");
    expect(context).toContain(
      '<workspace path="apps/web" confidence="high" source="pnpm-workspace.yaml" manager="pnpm" stack="JavaScript, React, Vite" evidence="pnpm-workspace.yaml present" />',
    );
    expect(context).toContain(
      '<workspace path="packages/ui" confidence="high" source="pnpm-workspace.yaml" manager="pnpm" stack="JavaScript, React" evidence="pnpm-workspace.yaml present" />',
    );
  });

  test("caps rendered workspace entries for large monorepos", () => {
    const workspaceSignals: RepoSignal[] = Array.from({ length: 45 }, (_, index) => {
      const path = `packages/pkg-${String(index + 1).padStart(2, "0")}`;
      return {
        kind: "workspace",
        name: path,
        confidence: "high",
        source: "pnpm-workspace.yaml",
        evidence: "pnpm-workspace.yaml present",
        metadata: {
          path,
          manager: "pnpm",
          pattern: "packages/*",
          stack: ["JavaScript", index % 2 === 0 ? "React" : "Vue"],
        },
      };
    });
    const scan: RepoScan = {
      cwd: "/tmp/minimap-large-monorepo",
      generatedAt: "2026-05-02T00:00:00.000Z",
      filesRead: [],
      warnings: [],
      signals: workspaceSignals,
    };

    const context = renderAgentContext(scan);
    const repeatedContext = renderAgentContext(scan);

    expect(repeatedContext).toBe(context);
    expect(context.match(/<workspace path=/g)?.length).toBe(40);
    expect(context).toContain('<workspace_overflow total="45" rendered="40" omitted="5">');
    expect(context).toContain(
      '<workspace_group count="5" source="pnpm-workspace.yaml" manager="pnpm" pattern="packages/*" />',
    );
    expect(context).toContain('<workspace path="packages/pkg-40"');
    expect(context).toContain('stack="JavaScript, React"');
    expect(context).toContain('stack="JavaScript, Vue"');
    expect(context).not.toContain('<workspace path="packages/pkg-41"');
  });

  test("respects configurable rendering limits", () => {
    const workspaceSignals: RepoSignal[] = Array.from({ length: 3 }, (_, index) => ({
      kind: "workspace",
      name: `packages/pkg-${index + 1}`,
      confidence: "high",
      source: "pnpm-workspace.yaml",
      evidence: "pnpm-workspace.yaml present",
      metadata: {
        path: `packages/pkg-${index + 1}`,
        manager: "pnpm",
        pattern: "packages/*",
      },
    }));
    const scan: RepoScan = {
      cwd: "/tmp/minimap-limits",
      generatedAt: "2026-05-02T00:00:00.000Z",
      filesRead: [],
      warnings: [],
      signals: [
        {
          kind: "language",
          name: "JavaScript",
          confidence: "high",
          source: "package.json",
          evidence: "package.json present",
        },
        {
          kind: "language",
          name: "TypeScript",
          confidence: "high",
          source: "package.json",
          evidence: "typescript dependency detected",
        },
        ...workspaceSignals,
      ],
    };

    const context = renderAgentContext(scan, "agents", { evidenceLimit: 1, workspaceLimit: 1 });

    expect(context.match(/<workspace path=/g)?.length).toBe(1);
    expect(context.match(/<item source=/g)?.length).toBe(1);
    expect(context).toContain('<workspace_overflow total="3" rendered="1" omitted="2">');
  });
});
