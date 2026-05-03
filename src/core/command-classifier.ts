export type CommandCategory =
  | "install"
  | "dev"
  | "build"
  | "test"
  | "lint"
  | "typecheck"
  | "format"
  | "e2e"
  | "preview"
  | "deploy"
  | "dangerous"
  | "unknown";

const dangerousPatterns = [
  /\b(migrate:fresh|migrate:reset|migrate\s+--force|db:wipe|seed)\b/i,
  /\bprisma\s+migrate\s+(deploy|dev|reset)\b/i,
  /\brails\s+db:(drop|migrate:reset|reset|schema:load|setup)\b/i,
  /\brake\s+db:(drop|migrate:reset|reset|schema:load|setup)\b/i,
  /\bkubectl\s+delete\b/i,
  /\bterraform\s+(apply|destroy)\b/i,
  /\bdocker\s+volume\s+prune\b/i,
  /\bdocker\s+(compose\s+down|system\s+prune)\s+.*\s-v\b/i,
  /\bdocker-compose\s+down\s+.*\s-v\b/i,
  /\b(rm -rf|publish|deploy)\b/i,
];

export function classifyCommand(name: string, value: string): CommandCategory {
  const normalizedName = name.toLowerCase();
  const normalizedValue = value.toLowerCase();
  const haystack = `${name} ${value}`.toLowerCase();

  if (dangerousPatterns.some((pattern) => pattern.test(haystack))) return "dangerous";
  if (/\b(e2e)\b/.test(normalizedName)) return "e2e";
  if (/\b(typecheck|type-check|types|stan|analyse|analyze)\b/.test(normalizedName))
    return "typecheck";
  if (/\b(lint|check)\b/.test(normalizedName)) return "lint";
  if (/\b(format|pint)\b/.test(normalizedName)) return "format";
  if (/^test(:|$)/.test(normalizedName)) return "test";
  if (/\b(install|ci)\b/.test(haystack)) return "install";
  if (
    /\b(dev|serve|watch|start)\b/.test(normalizedName) ||
    /\b(next dev|webpack serve|sail up)\b/.test(normalizedValue) ||
    normalizedValue === "vite" ||
    normalizedValue.startsWith("vite --")
  ) {
    return "dev";
  }
  if (/\b(preview)\b/.test(haystack)) return "preview";
  if (/\b(e2e|playwright|cypress)\b/.test(haystack)) return "e2e";
  if (
    /\b(typecheck|type-check|tsc|vue-tsc|svelte-check|phpstan|analyse|analyze)\b/.test(haystack)
  ) {
    return "typecheck";
  }
  if (/\b(format|prettier|biome format|pint)\b/.test(haystack)) return "format";
  if (/\b(lint|eslint|oxlint|biome|pint --test)\b/.test(haystack)) return "lint";
  if (/\b(test|vitest|jest|pest|phpunit)\b/.test(haystack)) return "test";
  if (/\b(build|vite build|next build)\b/.test(haystack)) return "build";
  if (/\b(deploy)\b/.test(haystack)) return "deploy";

  return "unknown";
}

export function commandSignalName(
  ecosystem: "node" | "php",
  scriptName: string,
  command: string,
  nodeDomain: "frontend" | "cli" | "node" = "frontend",
): string {
  const category = classifyCommand(scriptName, command);
  const prefix = ecosystem === "node" ? nodeDomain : "php";

  if (category === "unknown")
    return `${prefix}_${scriptName.replaceAll(/[^a-z0-9]+/gi, "_").toLowerCase()}`;
  if (category === "dangerous")
    return `dangerous_${scriptName.replaceAll(/[^a-z0-9]+/gi, "_").toLowerCase()}`;
  if (category === "typecheck") return ecosystem === "php" ? "php_static_analysis" : "typecheck";
  if (category === "test") return ecosystem === "php" ? "php_tests" : "test";
  if (["dev", "build", "lint", "format", "e2e", "preview", "deploy"].includes(category)) {
    return ecosystem === "node" ? `${prefix}_${category}` : `php_${category}`;
  }

  return category;
}

export function isUsefulCommand(name: string, value: string): boolean {
  return classifyCommand(name, value) !== "unknown";
}
