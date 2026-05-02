import { endMarker, startMarker } from "../renderers/render-agent-context";

export class ManagedBlockError extends Error {}

export function countManagedBlocks(content: string): number {
  return content.split(startMarker).length - 1;
}

export function getManagedBlock(content: string): string | null {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);
  if (start === -1 || end === -1) return null;
  if (countManagedBlocks(content) > 1) {
    throw new ManagedBlockError("Multiple minimap managed blocks found.");
  }
  return content.slice(start, end + endMarker.length);
}

export function upsertManagedBlock(content: string, block: string): string {
  const normalizedBlock = block.endsWith("\n") ? block : `${block}\n`;
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);

  if (countManagedBlocks(content) > 1) {
    throw new ManagedBlockError(
      "Multiple minimap managed blocks found. Refusing to write to avoid data loss.",
    );
  }

  if (start !== -1 && end !== -1) {
    return `${content.slice(0, start)}${normalizedBlock.trimEnd()}${content.slice(end + endMarker.length)}`;
  }

  if (start !== -1 || end !== -1) {
    throw new ManagedBlockError(
      "Incomplete minimap managed block found. Refusing to write to avoid data loss.",
    );
  }

  if (content.length === 0) return normalizedBlock;
  const separator = content.endsWith("\n") ? "\n" : "\n\n";
  return `${content}${separator}${normalizedBlock}`;
}

export function normalizeBlock(content: string): string {
  return content.trim().replaceAll(/\r\n/g, "\n");
}
