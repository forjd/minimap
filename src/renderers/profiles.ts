export type RenderProfile = "agents" | "claude";

export function parseProfile(value: string | undefined): RenderProfile {
  if (value === undefined || value === "agents" || value === "claude") return value ?? "agents";
  throw new Error(`Unsupported profile "${value}". Expected one of: agents, claude.`);
}

export function parsePositiveIntegerOption(
  name: string,
  value: string | undefined,
): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) return parsed;
  throw new Error(`Unsupported ${name} "${value}". Expected a positive integer.`);
}
