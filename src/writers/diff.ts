export function simpleDiffMessage(target: string): string {
  return `${target} minimap block is stale. Run \`minimap write --target ${target}\` to update it.`;
}
