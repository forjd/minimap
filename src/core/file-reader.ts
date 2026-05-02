import { existsSync, realpathSync } from "node:fs";
import { realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import type { RepoFileMap } from "./signals";

const maxReadBytes = 256_000;

function isInside(base: string, path: string): boolean {
  const rel = relative(base, path);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function safePath(cwd: string, path: string): string {
  const fullPath = resolve(cwd, path);
  if (!isInside(cwd, fullPath)) {
    throw new Error(`Refusing to read outside repository: ${path}`);
  }
  return fullPath;
}

async function safeRealPath(cwd: string, fullPath: string, label: string): Promise<string> {
  const realPath = await realpath(fullPath);
  if (!isInside(cwd, realPath)) {
    throw new Error(`Refusing to read outside repository: ${label}`);
  }
  return realPath;
}

export function createRepoFileMap(
  cwd: string,
  filesRead: Set<string>,
  warnings: string[],
): RepoFileMap {
  const realCwd = realpathSync(cwd);
  const existsCache = new Map<string, boolean>();
  const textCache = new Map<string, Promise<string | null>>();
  const jsonCache = new Map<string, Promise<unknown | null>>();
  const globCache = new Map<string, Promise<string[]>>();
  const listFilesCache = new Map<string, Promise<string[]>>();

  return {
    exists(path) {
      const cached = existsCache.get(path);
      if (cached !== undefined) return cached;
      const filePath = safePath(cwd, path);
      const exists = existsSync(filePath);
      if (exists) {
        const realPath = realpathSync(filePath);
        if (!isInside(realCwd, realPath)) {
          throw new Error(`Refusing to read outside repository: ${path}`);
        }
      }
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
        const realPath = await safeRealPath(realCwd, filePath, path);
        existsCache.set(path, true);
        if (file.size > maxReadBytes) {
          warnings.push(`Skipped ${path}: file is larger than ${maxReadBytes} bytes.`);
          return null;
        }
        filesRead.add(path);
        return Bun.file(realPath).text();
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
