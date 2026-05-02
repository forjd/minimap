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
  const existsCache = new Map<string, boolean>();
  const textCache = new Map<string, Promise<string | null>>();
  const jsonCache = new Map<string, Promise<unknown | null>>();
  const globCache = new Map<string, Promise<string[]>>();
  const listFilesCache = new Map<string, Promise<string[]>>();

  return {
    exists(path) {
      const cached = existsCache.get(path);
      if (cached !== undefined) return cached;
      const exists = existsSync(safePath(cwd, path));
      existsCache.set(path, exists);
      return exists;
    },

    async readText(path) {
      const cached = textCache.get(path);
      if (cached) return cached;

      const read = async () => {
        const filePath = safePath(cwd, path);
        const file = Bun.file(filePath);
        if (!(await file.exists())) return null;
        existsCache.set(path, true);
        if (file.size > maxReadBytes) {
          warnings.push(`Skipped ${path}: file is larger than ${maxReadBytes} bytes.`);
          return null;
        }
        filesRead.add(path);
        return file.text();
      };

      const promise = read();
      textCache.set(path, promise);
      return promise;
    },

    async readJson<T>(path: string) {
      const cached = jsonCache.get(path);
      if (cached) return (await cached) as T | null;

      const parse = async () => {
        const text = await this.readText(path);
        if (text === null) return null;
        try {
          return JSON.parse(text) as unknown;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          warnings.push(`Could not parse ${path}: ${message}`);
          return null;
        }
      };

      const promise = parse();
      jsonCache.set(path, promise);
      return (await promise) as T | null;
    },

    async listFiles(patterns) {
      const key = patterns.join("\0");
      const cached = listFilesCache.get(key);
      if (cached) return cached;

      const scanPattern = (pattern: string) => {
        const cachedPattern = globCache.get(pattern);
        if (cachedPattern) return cachedPattern;

        const scan = async () => {
          const matches: string[] = [];
          const glob = new Bun.Glob(pattern);
          for await (const match of glob.scan({ cwd, onlyFiles: true })) {
            matches.push(match);
            filesRead.add(match);
          }
          return matches;
        };

        const promise = scan();
        globCache.set(pattern, promise);
        return promise;
      };

      const scan = async () => {
        const matches = (await Promise.all(patterns.map(scanPattern))).flat();
        return [...new Set(matches)].sort();
      };

      const promise = scan();
      listFilesCache.set(key, promise);
      return promise;
    },
  };
}
