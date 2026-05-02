import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";

export function resolveCwd(cwd?: string): string {
  return resolve(cwd ?? process.cwd());
}

export function resolveTarget(cwd: string, target: string): string {
  return resolve(cwd, target);
}

export async function ensureParentDirectory(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
}
