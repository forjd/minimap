export function simpleDiffMessage(target: string): string {
  return `${target} minimap block is stale. Run \`minimap write --target ${target}\` to update it.`;
}

const MAX_DIFF_LINES = 8;

function formatChangedLines(prefix: "-" | "+", lines: string[]): string[] {
  const visible = lines.slice(0, MAX_DIFF_LINES).map((line) => `${prefix}${line}`);
  const hidden = lines.length - visible.length;
  if (hidden > 0) {
    visible.push(`${prefix}... ${hidden} more line${hidden === 1 ? "" : "s"}`);
  }
  return visible;
}

export function compactDiffMessage(target: string, existing: string, expected: string): string {
  const existingLines = existing.split("\n");
  const expectedLines = expected.split("\n");

  let start = 0;
  while (
    start < existingLines.length &&
    start < expectedLines.length &&
    existingLines[start] === expectedLines[start]
  ) {
    start += 1;
  }

  let existingEnd = existingLines.length - 1;
  let expectedEnd = expectedLines.length - 1;
  while (
    existingEnd >= start &&
    expectedEnd >= start &&
    existingLines[existingEnd] === expectedLines[expectedEnd]
  ) {
    existingEnd -= 1;
    expectedEnd -= 1;
  }

  const removed = existingLines.slice(start, existingEnd + 1);
  const added = expectedLines.slice(start, expectedEnd + 1);
  const header = `${target} minimap block is stale. Run \`minimap write --target ${target}\` to update it.`;
  const hunk = [
    "",
    "Diff (current -> expected):",
    `@@ line ${start + 1} @@`,
    ...formatChangedLines("-", removed),
    ...formatChangedLines("+", added),
  ];

  return [header, ...hunk].join("\n");
}
