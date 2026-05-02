import { resolve } from "node:path";

import { detectCi } from "../detectors/ci";
import { detectFrontend } from "../detectors/frontend";
import { detectLaravel } from "../detectors/laravel";
import { detectNode } from "../detectors/node";
import { detectPhp } from "../detectors/php";
import { detectTesting } from "../detectors/testing";
import { createRepoFileMap } from "./file-reader";
import type { Detector, RepoScan } from "./signals";
import { sortSignals, uniqueSignals } from "./sort-signals";

const detectors: Detector[] = [
  detectNode,
  detectPhp,
  detectLaravel,
  detectFrontend,
  detectTesting,
  detectCi,
];

export async function scanRepo(cwd = process.cwd()): Promise<RepoScan> {
  const resolvedCwd = resolve(cwd);
  const filesRead = new Set<string>();
  const warnings: string[] = [];
  const files = createRepoFileMap(resolvedCwd, filesRead, warnings);
  const signals = [];

  for (const detector of detectors) {
    signals.push(...(await detector({ cwd: resolvedCwd, files, warnings })));
  }

  if (!files.exists("package.json") && !files.exists("composer.json")) {
    warnings.push(
      "No supported project files found. Expected one of: package.json, composer.json.",
    );
  }

  return {
    cwd: resolvedCwd,
    generatedAt: new Date().toISOString(),
    signals: sortSignals(uniqueSignals(signals)),
    filesRead: [...filesRead].sort(),
    warnings: [...new Set(warnings)].sort(),
  };
}
