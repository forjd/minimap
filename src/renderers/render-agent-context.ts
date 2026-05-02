import type { RepoScan, RepoSignal } from "../core/signals";
import { xmlAttribute, xmlText } from "./xml";

export const startMarker = "<!-- minimap:start -->";
export const endMarker = "<!-- minimap:end -->";

function hasSignal(scan: RepoScan, name: string): boolean {
  return scan.signals.some((signal) => signal.name === name);
}

function signalsByKind(scan: RepoScan, kinds: RepoSignal["kind"][]): RepoSignal[] {
  return scan.signals.filter((signal) => kinds.includes(signal.kind));
}

function summarize(scan: RepoScan): string {
  const parts: string[] = [];
  if (hasSignal(scan, "Laravel")) parts.push("Laravel");
  if (hasSignal(scan, "Vue") && hasSignal(scan, "Inertia")) parts.push("Vue/Inertia");
  else if (hasSignal(scan, "Vue")) parts.push("Vue");
  if (hasSignal(scan, "React")) parts.push("React");
  if (hasSignal(scan, "Next.js")) parts.push("Next.js");
  if (hasSignal(scan, "PHP") && !parts.includes("Laravel")) parts.push("PHP");
  if (hasSignal(scan, "TypeScript")) parts.push("TypeScript");
  else if (hasSignal(scan, "JavaScript")) parts.push("JavaScript");

  const tools = [
    "Composer",
    "Bun",
    "pnpm",
    "Yarn",
    "npm",
    "Pest",
    "PHPUnit",
    "Vitest",
    "Vite",
    "Tailwind CSS",
  ].filter((name) => hasSignal(scan, name));

  if (parts.length === 0) return "Repository context inferred from supported project manifests.";
  return `${parts.join(" + ")} project${tools.length ? ` using ${tools.join(", ")}` : ""}.`;
}

function elementName(signal: RepoSignal): string {
  if (signal.kind === "language") return "language";
  if (signal.kind === "framework") return "framework";
  if (signal.kind === "test-framework") return "test_framework";
  return "tool";
}

function renderStack(signals: RepoSignal[]): string[] {
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

function guidance(scan: RepoScan): string[] {
  const rules = [
    "Inspect nearby files before introducing new patterns.",
    "Prefer existing project conventions over generic framework defaults.",
    "When changing behaviour, add or update tests where practical.",
  ];

  if (hasSignal(scan, "Laravel")) {
    rules.push("Prefer existing Laravel conventions in this repository over generic patterns.");
    rules.push("Use Form Requests for validation if the project already uses them.");
    rules.push("Use Eloquent relationships and query scopes where consistent with nearby code.");
    rules.push("Do not introduce a repository layer unless the repository already uses one.");
  }

  const hasDanger = scan.signals.some(
    (signal) => signal.kind === "risk" || signal.metadata?.category === "dangerous",
  );
  if (hasDanger || hasSignal(scan, "Laravel")) {
    rules.push(
      "Do not run destructive database, deployment, publishing, or volume deletion commands unless explicitly requested.",
    );
  }

  return [...new Set(rules)];
}

function renderGuidance(scan: RepoScan): string[] {
  return [
    "  <agent_guidance>",
    ...guidance(scan).map((rule) => `    <rule>${xmlText(rule)}</rule>`),
    "  </agent_guidance>",
    "",
  ];
}

function renderEvidence(scan: RepoScan): string[] {
  const seen = new Set<string>();
  const items = scan.signals
    .filter((signal) => signal.kind !== "command" && signal.kind !== "risk")
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
  const stack = signalsByKind(scan, ["language", "framework", "tool", "test-framework"]);
  const packageManagers = signalsByKind(scan, ["package-manager"]);
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
    ...renderCommands(commands),
    ...renderProjectConventions(scan),
    ...renderGuidance(scan),
    ...renderEvidence(scan),
    ...renderWarnings(scan),
    "</repo_context>",
    endMarker,
  ];

  return `${lines.join("\n")}\n`;
}
