import { resolve } from "node:path";

import { detectCi } from "../detectors/ci";
import { detectApple } from "../detectors/apple";
import { detectC } from "../detectors/c";
import { detectDeployment } from "../detectors/deployment";
import { detectDocs } from "../detectors/docs";
import {
  detectDotNet,
  detectGo,
  detectJava,
  detectPython,
  detectRuby,
  detectRust,
} from "../detectors/ecosystems";
import { detectFrontend } from "../detectors/frontend";
import { detectInfrastructure } from "../detectors/infrastructure";
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
  detectPython,
  detectRust,
  detectGo,
  detectRuby,
  detectJava,
  detectDotNet,
  detectApple,
  detectC,
  detectFrontend,
  detectTesting,
  detectInfrastructure,
  detectDeployment,
  detectDocs,
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

  if (
    signals.length === 0 &&
    !files.exists("package.json") &&
    !files.exists("composer.json") &&
    !files.exists("pyproject.toml") &&
    !files.exists("requirements.txt") &&
    !files.exists("Cargo.toml") &&
    !files.exists("go.mod") &&
    !files.exists("Gemfile") &&
    !files.exists("pom.xml") &&
    !files.exists("build.gradle") &&
    !files.exists("build.gradle.kts") &&
    !files.exists("Package.swift") &&
    (await files.listFiles(["*.csproj", "*.fsproj", "*.sln"])).length === 0
  ) {
    warnings.push(
      "No supported project files found. Expected a supported language or package manifest.",
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
