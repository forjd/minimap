import { join, normalize, relative } from "node:path";
import { existsSync } from "node:fs";

import type { RepoFileMap } from "./signals";

const maxReadBytes = 256_000;

function safePath(cwd: string, path: string): string {
  const fullPath = normalize(join(cwd, path));
  const rel = relative(cwd, fullPath);
  if (rel.startsWith("..") || rel === "..") {
    throw new Error(`Refusing to read outside repository: ${path}`);
  }
  return fullPath;
}

export function createRepoFileMap(
  cwd: string,
  filesRead: Set<string>,
  warnings: string[],
): RepoFileMap {
  return {
    exists(path) {
      return existsSync(safePath(cwd, path));
    },

    async readText(path) {
      const filePath = safePath(cwd, path);
      const file = Bun.file(filePath);
      if (!(await file.exists())) return null;
      if (file.size > maxReadBytes) {
        warnings.push(`Skipped ${path}: file is larger than ${maxReadBytes} bytes.`);
        return null;
      }
      filesRead.add(path);
      return file.text();
    },

    async readJson<T>(path: string) {
      const text = await this.readText(path);
      if (text === null) return null;
      try {
        return JSON.parse(text) as T;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warnings.push(`Could not parse ${path}: ${message}`);
        return null;
      }
    },

    async listFiles(patterns) {
      const matches: string[] = [];
      for (const pattern of patterns) {
        const glob = new Bun.Glob(pattern);
        for await (const match of glob.scan({ cwd, onlyFiles: true })) {
          matches.push(match);
          filesRead.add(match);
        }
      }
      return [...new Set(matches)].sort();
    },
  };
}
