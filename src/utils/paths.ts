import { mkdir, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";

export function resolveCwd(cwd?: string): string {
  return resolve(cwd ?? process.cwd());
}

function isInside(base: string, path: string): boolean {
  const rel = relative(base, path);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function resolveTarget(cwd: string, target: string): string {
  const targetPath = resolve(cwd, target);
  if (!isInside(cwd, targetPath)) {
    throw new Error(`Refusing to target outside repository: ${target}`);
  }
  return targetPath;
}

export async function ensureSafeTarget(cwd: string, path: string, target: string): Promise<void> {
  const parent = dirname(path);
  await mkdir(parent, { recursive: true });

  const realCwd = await realpath(cwd);
  const realParent = await realpath(parent);
  if (!isInside(realCwd, realParent)) {
    throw new Error(`Refusing to target outside repository: ${target}`);
  }

  await assertExistingTargetInside(realCwd, path, target);
}

export async function assertExistingTargetInside(
  cwd: string,
  path: string,
  target: string,
): Promise<void> {
  const realCwd = await realpath(cwd);
  let realTarget: string;
  try {
    realTarget = await realpath(path);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
    throw error;
  }

  if (!isInside(realCwd, realTarget)) {
    throw new Error(`Refusing to target outside repository: ${target}`);
  }
}
