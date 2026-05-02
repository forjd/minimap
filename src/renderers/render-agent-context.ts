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
  const isCliApp = hasSignal(scan, "CLI application");
  if (hasSignal(scan, "TypeScript")) parts.push(isCliApp ? "TypeScript CLI" : "TypeScript");
  else if (hasSignal(scan, "JavaScript")) parts.push(isCliApp ? "JavaScript CLI" : "JavaScript");
  else if (isCliApp) parts.push("CLI");

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
  if (signal.kind === "architecture") return "architecture";
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
  const stack = signalsByKind(scan, [
    "language",
    "framework",
    "tool",
    "test-framework",
    "architecture",
  ]);
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
    ...renderEvidence(scan),
    ...renderWarnings(scan),
    "</repo_context>",
    endMarker,
  ];

  return `${lines.join("\n")}\n`;
}
