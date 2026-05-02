#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const result = spawnSync(
  "bun",
  ["run", new URL("../src/cli.ts", import.meta.url).pathname, ...process.argv.slice(2)],
  {
    stdio: "inherit",
  },
);

if (result.error) {
  console.error("Minimap requires Bun. Install it from https://bun.sh and try again.");
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
