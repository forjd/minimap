export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function runCommand(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    console.error(errorMessage(error));
    process.exitCode = 1;
  }
}
