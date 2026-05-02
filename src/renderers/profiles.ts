export type RenderProfile = "agents" | "claude";

export function parseProfile(value: string | undefined): RenderProfile {
  if (value === undefined || value === "agents" || value === "claude") return value ?? "agents";
  throw new Error(`Unsupported profile "${value}". Expected one of: agents, claude.`);
}
