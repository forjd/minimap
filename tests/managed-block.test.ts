import { describe, expect, test } from "bun:test";

import { endMarker, startMarker } from "../src/renderers/render-agent-context";
import {
  ManagedBlockError,
  getManagedBlock,
  upsertManagedBlock,
} from "../src/writers/managed-block";

const block = `${startMarker}
<repo_context generated_by="minimap" schema_version="1">
</repo_context>
${endMarker}
`;

describe("managed block writer", () => {
  test("inserts into new content", () => {
    expect(upsertManagedBlock("", block)).toBe(block);
  });

  test("appends to existing content", () => {
    expect(upsertManagedBlock("# Existing\n", block)).toBe(`# Existing\n\n${block}`);
  });

  test("replaces existing block only", () => {
    const old = `${startMarker}\nold\n${endMarker}`;
    expect(upsertManagedBlock(`before\n\n${old}\n\nafter`, block)).toBe(
      `before\n\n${block.trimEnd()}\n\nafter`,
    );
  });

  test("refuses multiple blocks", () => {
    expect(() => upsertManagedBlock(`${block}\n${block}`, block)).toThrow(ManagedBlockError);
  });

  test("extracts a managed block", () => {
    expect(getManagedBlock(`before\n${block}\nafter`)).toBe(block.trimEnd());
  });
});
