import type { Detector, RepoSignal } from "../core/signals";

export const detectCi: Detector = async ({ files }) => {
  const workflows = await files.listFiles([".github/workflows/*.yml", ".github/workflows/*.yaml"]);
  if (workflows.length === 0) return [];

  const signals: RepoSignal[] = [
    {
      kind: "tool",
      name: "GitHub Actions",
      confidence: "high",
      source: ".github/workflows",
      evidence: "GitHub Actions workflow files present",
    },
  ];

  for (const workflow of workflows) {
    const text = await files.readText(workflow);
    const nameMatch = text?.match(/^name:\s*(.+)$/m);
    if (nameMatch?.[1]) {
      signals.push({
        kind: "convention",
        name: `CI workflow: ${nameMatch[1].trim().replace(/^["']|["']$/g, "")}`,
        confidence: "medium",
        source: workflow,
        evidence: "workflow name detected",
      });
    }
  }

  return signals;
};
