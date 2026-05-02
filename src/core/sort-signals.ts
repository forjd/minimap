import type { RepoSignal } from "./signals";

const kindOrder = new Map(
  [
    "language",
    "framework",
    "tool",
    "test-framework",
    "package-manager",
    "command",
    "architecture",
    "convention",
    "risk",
  ].map((kind, index) => [kind, index]),
);

const confidenceOrder = new Map([
  ["high", 0],
  ["medium", 1],
  ["low", 2],
]);

export function sortSignals(signals: RepoSignal[]): RepoSignal[] {
  return [...signals].sort((a, b) => {
    return (
      (kindOrder.get(a.kind) ?? 99) - (kindOrder.get(b.kind) ?? 99) ||
      a.name.localeCompare(b.name) ||
      (confidenceOrder.get(a.confidence) ?? 99) - (confidenceOrder.get(b.confidence) ?? 99) ||
      a.source.localeCompare(b.source) ||
      a.evidence.localeCompare(b.evidence)
    );
  });
}

export function uniqueSignals(signals: RepoSignal[]): RepoSignal[] {
  const seen = new Set<string>();
  const unique: RepoSignal[] = [];

  for (const signal of signals) {
    const key = JSON.stringify([
      signal.kind,
      signal.name,
      signal.source,
      signal.evidence,
      signal.metadata ?? {},
    ]);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(signal);
  }

  return unique;
}
