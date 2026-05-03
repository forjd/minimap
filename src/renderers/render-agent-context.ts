import type { RepoScan, RepoSignal } from "../core/signals";
import { xmlAttribute, xmlText } from "./xml";

export const startMarker = "<!-- minimap:start -->";
export const endMarker = "<!-- minimap:end -->";
const maxRenderedWorkspaces = 40;
const maxWorkspaceSummaryGroups = 8;

function hasSignal(scan: RepoScan, name: string): boolean {
  return scan.signals.some((signal) => signal.name === name);
}

function signalsByKind(scan: RepoScan, kinds: RepoSignal["kind"][]): RepoSignal[] {
  return scan.signals.filter((signal) => kinds.includes(signal.kind));
}

function dedupeSignalsByKindAndName(signals: RepoSignal[]): RepoSignal[] {
  const seen = new Set<string>();
  const deduped: RepoSignal[] = [];

  for (const signal of signals) {
    const key = `${signal.kind}:${signal.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(signal);
  }

  return deduped;
}

function summarize(scan: RepoScan): string {
  const parts: string[] = [];
  if (hasSignal(scan, "Laravel")) parts.push("Laravel");
  if (hasSignal(scan, "Vue") && hasSignal(scan, "Inertia")) parts.push("Vue/Inertia");
  else if (hasSignal(scan, "Vue")) parts.push("Vue");
  if (hasSignal(scan, "React")) parts.push("React");
  if (hasSignal(scan, "Next.js")) parts.push("Next.js");
  for (const framework of [
    "Astro",
    "SvelteKit",
    "Svelte",
    "Remix",
    "Angular",
    "Django",
    "FastAPI",
    "Flask",
    "Ruby on Rails",
    "Spring Boot",
    "ASP.NET Core",
    "SwiftUI",
  ]) {
    if (hasSignal(scan, framework) && !parts.includes(framework)) parts.push(framework);
  }
  if (hasSignal(scan, "PHP") && !parts.includes("Laravel")) parts.push("PHP");
  const isCliApp = hasSignal(scan, "CLI application");
  if (hasSignal(scan, "Monorepo")) parts.push("Monorepo");
  if (hasSignal(scan, "TypeScript")) parts.push(isCliApp ? "TypeScript CLI" : "TypeScript");
  else if (hasSignal(scan, "JavaScript")) parts.push(isCliApp ? "JavaScript CLI" : "JavaScript");
  for (const language of [
    "Python",
    "Rust",
    "Go",
    "Ruby",
    "Java",
    "Kotlin",
    "C#",
    "F#",
    "Swift",
    "C",
    "C++",
    "Markdown",
  ]) {
    if (hasSignal(scan, language) && !parts.includes(language)) parts.push(language);
  }
  if (isCliApp && !parts.some((part) => part.includes("CLI"))) parts.push("CLI");

  const tools = [
    "Composer",
    "Bun",
    "pnpm",
    "Yarn",
    "npm",
    "Pest",
    "PHPUnit",
    "Vitest",
    "Bun test",
    "Vite",
    "Tailwind CSS",
    "Docker",
    "Docker Compose",
    "Make",
    "SwiftPM",
    "Cargo",
    "Go modules",
    "uv",
    "Poetry",
    ".NET SDK",
    "CMake",
    "Turborepo",
    "Nx",
    "Lerna",
  ].filter((name) => hasSignal(scan, name));

  if (parts.length === 0) return "Repository context inferred from supported project manifests.";
  return `${parts.join(" + ")} project${tools.length ? ` using ${tools.join(", ")}` : ""}.`;
}

function elementName(signal: RepoSignal): string {
  if (signal.kind === "language") return "language";
  if (signal.kind === "framework") return "framework";
  if (signal.kind === "test-framework") return "test_framework";
  if (signal.kind === "architecture") return "architecture";
  return "tool";
}

function renderStack(signals: RepoSignal[]): string[] {
  signals = dedupeSignalsByKindAndName(signals);
  if (signals.length === 0) return [];
  return [
    "  <stack>",
    ...signals.map((signal) => {
      const element = elementName(signal);
      return `    <${element} name="${xmlAttribute(signal.name)}" confidence="${signal.confidence}" evidence="${xmlAttribute(signal.evidence)}" />`;
    }),
    "  </stack>",
    "",
  ];
}

function renderPackageManagers(signals: RepoSignal[]): string[] {
  signals = dedupeSignalsByKindAndName(signals);
  if (signals.length === 0) return [];
  return [
    "  <package_managers>",
    ...signals.map(
      (signal) =>
        `    <manager name="${xmlAttribute(signal.name)}" confidence="${signal.confidence}" evidence="${xmlAttribute(signal.evidence)}" />`,
    ),
    "  </package_managers>",
    "",
  ];
}

function renderWorkspaces(signals: RepoSignal[]): string[] {
  signals = dedupeSignalsByKindAndName(signals);
  if (signals.length === 0) return [];
  const rendered = signals.slice(0, maxRenderedWorkspaces);
  const omitted = signals.slice(maxRenderedWorkspaces);
  const allSummaryGroups = workspaceSummaryGroups(omitted);
  const summaryGroups = allSummaryGroups.slice(0, maxWorkspaceSummaryGroups);
  const remainingGroupCount = Math.max(0, allSummaryGroups.length - summaryGroups.length);

  return [
    "  <workspaces>",
    ...rendered.map((signal) => {
      const path = String(signal.metadata?.path ?? signal.name);
      const manager = signal.metadata?.manager
        ? ` manager="${xmlAttribute(String(signal.metadata.manager))}"`
        : "";
      const stack = Array.isArray(signal.metadata?.stack)
        ? ` stack="${xmlAttribute(signal.metadata.stack.map(String).join(", "))}"`
        : "";
      return `    <workspace path="${xmlAttribute(path)}" confidence="${signal.confidence}" source="${xmlAttribute(signal.source)}"${manager}${stack} evidence="${xmlAttribute(signal.evidence)}" />`;
    }),
    ...renderWorkspaceOverflow(
      signals.length,
      rendered.length,
      omitted.length,
      summaryGroups,
      remainingGroupCount,
    ),
    "  </workspaces>",
    "",
  ];
}

function workspaceSummaryGroups(signals: RepoSignal[]): Array<{
  count: number;
  source: string;
  manager: string | null;
  pattern: string | null;
}> {
  const groups = new Map<
    string,
    { count: number; source: string; manager: string | null; pattern: string | null }
  >();

  for (const signal of signals) {
    const manager = signal.metadata?.manager === undefined ? null : String(signal.metadata.manager);
    const pattern = signal.metadata?.pattern === undefined ? null : String(signal.metadata.pattern);
    const key = JSON.stringify([signal.source, manager, pattern]);
    const group = groups.get(key);
    if (group) {
      group.count += 1;
      continue;
    }
    groups.set(key, { count: 1, source: signal.source, manager, pattern });
  }

  return [...groups.values()].sort(
    (a, b) =>
      b.count - a.count ||
      a.source.localeCompare(b.source) ||
      (a.manager ?? "").localeCompare(b.manager ?? "") ||
      (a.pattern ?? "").localeCompare(b.pattern ?? ""),
  );
}

function renderWorkspaceOverflow(
  total: number,
  rendered: number,
  omitted: number,
  groups: ReturnType<typeof workspaceSummaryGroups>,
  remainingGroupCount: number,
): string[] {
  if (omitted === 0) return [];

  return [
    `    <workspace_overflow total="${total}" rendered="${rendered}" omitted="${omitted}">`,
    ...groups.map((group) => {
      const manager = group.manager ? ` manager="${xmlAttribute(group.manager)}"` : "";
      const pattern = group.pattern ? ` pattern="${xmlAttribute(group.pattern)}"` : "";
      return `      <workspace_group count="${group.count}" source="${xmlAttribute(group.source)}"${manager}${pattern} />`;
    }),
    ...(remainingGroupCount > 0
      ? [`      <workspace_group_overflow omitted_groups="${remainingGroupCount}" />`]
      : []),
    "    </workspace_overflow>",
  ];
}

function renderCommands(signals: RepoSignal[]): string[] {
  if (signals.length === 0) return [];
  return [
    "  <commands>",
    ...signals.map((signal) => {
      const value = signal.metadata?.value ?? signal.evidence;
      const category = signal.metadata?.category
        ? ` category="${xmlAttribute(signal.metadata.category)}"`
        : "";
      return `    <command name="${xmlAttribute(signal.name)}" value="${xmlAttribute(value)}" confidence="${signal.confidence}"${category} />`;
    }),
    "  </commands>",
    "",
  ];
}

function projectConventions(scan: RepoScan): string[] {
  const items: string[] = [];
  if (hasSignal(scan, "Pest"))
    items.push("Use Pest style for PHP tests unless nearby tests use PHPUnit style.");
  if (hasSignal(scan, "Inertia") && hasSignal(scan, "Vue")) {
    items.push(
      "For frontend changes, inspect existing Inertia pages and Vue components before adding new patterns.",
    );
  }
  if (hasSignal(scan, "Tailwind CSS")) {
    items.push(
      "Use existing Tailwind conventions. Do not create a Tailwind config file unless the repo already has one.",
    );
  }
  if (hasSignal(scan, "ES modules"))
    items.push("Use ES module syntax consistently with package.json type=module.");
  return [...new Set(items)];
}

function renderProjectConventions(scan: RepoScan): string[] {
  const items = projectConventions(scan);
  if (items.length === 0) return [];
  return [
    "  <project_conventions>",
    ...items.map((item) => `    <item>${xmlText(item)}</item>`),
    "  </project_conventions>",
    "",
  ];
}

function renderEvidence(scan: RepoScan): string[] {
  const seen = new Set<string>();
  const items = scan.signals
    .filter((signal) => signal.kind !== "command" && signal.kind !== "risk")
    .filter((signal) => signal.kind !== "workspace")
    .map((signal) => ({
      source: signal.source,
      text: `Detected ${signal.name}: ${signal.evidence}.`,
    }))
    .filter((item) => {
      const key = `${item.source}:${item.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);

  if (items.length === 0) return [];
  return [
    "  <evidence>",
    ...items.map(
      (item) => `    <item source="${xmlAttribute(item.source)}">${xmlText(item.text)}</item>`,
    ),
    "  </evidence>",
    "",
  ];
}

function renderWarnings(scan: RepoScan): string[] {
  if (scan.warnings.length === 0) return [];
  return [
    "  <warnings>",
    ...scan.warnings.map((warning) => `    <warning>${xmlText(warning)}</warning>`),
    "  </warnings>",
    "",
  ];
}

export function renderAgentContext(scan: RepoScan): string {
  const stack = signalsByKind(scan, [
    "language",
    "framework",
    "tool",
    "test-framework",
    "architecture",
  ]);
  const packageManagers = signalsByKind(scan, ["package-manager"]);
  const workspaces = signalsByKind(scan, ["workspace"]);
  const commands = signalsByKind(scan, ["command", "risk"]);

  const lines = [
    startMarker,
    '<repo_context generated_by="minimap" schema_version="1">',
    "  <summary>",
    `    ${xmlText(summarize(scan))}`,
    "  </summary>",
    "",
    ...renderStack(stack),
    ...renderPackageManagers(packageManagers),
    ...renderWorkspaces(workspaces),
    ...renderCommands(commands),
    ...renderProjectConventions(scan),
    ...renderEvidence(scan),
    ...renderWarnings(scan),
    "</repo_context>",
    endMarker,
  ];

  return `${lines.join("\n")}\n`;
}
