import type { Detector, RepoSignal } from "../core/signals";

const generatedContextFiles = new Set(["AGENTS.md", "CLAUDE.md", "GEMINI.md"]);

export const detectDocs: Detector = async ({ files }) => {
  const skillFiles = await files.listFiles(["SKILL.md", "skills/**/SKILL.md"]);
  const markdownFiles = (
    await files.listFiles(["*.md", "*/*.md", "docs/**/*.md", "skills/**/*.md"])
  ).filter((path) => !generatedContextFiles.has(path));
  const hasPluginManifest = files.exists(".codex-plugin/plugin.json");

  if (skillFiles.length === 0 && markdownFiles.length === 0 && !hasPluginManifest) return [];

  const signals: RepoSignal[] = [];

  if (markdownFiles.length > 0) {
    signals.push({
      kind: "language",
      name: "Markdown",
      confidence: "medium",
      source: markdownFiles.includes("README.md") ? "README.md" : (markdownFiles[0] ?? "*.md"),
      evidence:
        markdownFiles.length === 1
          ? "Markdown file present"
          : `${markdownFiles.length} Markdown files detected`,
    });
  }

  if (skillFiles.length > 0) {
    signals.push({
      kind: "architecture",
      name: "Codex skill",
      confidence: "high",
      source: skillFiles[0] ?? "SKILL.md",
      evidence:
        skillFiles.length === 1
          ? "SKILL.md present"
          : `${skillFiles.length} SKILL.md files detected`,
    });
  }

  if (hasPluginManifest) {
    signals.push({
      kind: "architecture",
      name: "Codex plugin",
      confidence: "high",
      source: ".codex-plugin/plugin.json",
      evidence: "Codex plugin manifest present",
    });
  }

  return signals;
};
