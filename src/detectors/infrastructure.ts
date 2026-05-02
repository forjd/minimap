import type { Detector, RepoSignal } from "../core/signals";

export const detectInfrastructure: Detector = async ({ files }) => {
  const signals: RepoSignal[] = [];
  const dockerfiles = await files.listFiles(["Dockerfile", "*/Dockerfile"]);

  if (dockerfiles.length > 0) {
    signals.push({
      kind: "tool",
      name: "Docker",
      confidence: "high",
      source: dockerfiles[0] ?? "Dockerfile",
      evidence: "Dockerfile present",
    });
  }

  const simpleTools: Array<[string, string, string]> = [
    ["Makefile", "Make", "Makefile present"],
    ["justfile", "Just", "justfile present"],
    ["Taskfile.yml", "Task", "Taskfile.yml present"],
    ["mise.toml", "mise", "mise.toml present"],
    [".tool-versions", "asdf", ".tool-versions present"],
    [".envrc", "direnv", ".envrc present"],
  ];

  for (const [path, name, evidence] of simpleTools) {
    if (!files.exists(path)) continue;
    signals.push({
      kind: "tool",
      name,
      confidence: "high",
      source: path,
      evidence,
    });
  }

  const composeFile =
    ["docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"].find((path) =>
      files.exists(path),
    ) ??
    (
      await files.listFiles([
        "*/docker-compose.yml",
        "*/docker-compose.yaml",
        "*/compose.yml",
        "*/compose.yaml",
      ])
    )[0];
  if (composeFile) {
    signals.push({
      kind: "tool",
      name: "Docker Compose",
      confidence: "high",
      source: composeFile,
      evidence: `${composeFile} present`,
    });
  }

  return signals;
};
