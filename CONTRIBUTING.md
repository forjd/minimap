# Contributing

Thanks for taking time to improve Minimap.

## Development Setup

Install dependencies:

```bash
bun install
```

Run the full local check set:

```bash
bun run format:check
bun run lint
bun run typecheck
bun test
```

Format changed files:

```bash
bun run format
```

## Commit Messages

This repository uses Conventional Commits. Examples:

```txt
feat: detect pnpm workspaces
fix(cli): handle missing target file
docs: clarify managed block behavior
```

Allowed types are `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, and `test`.

Husky hooks run after `bun install` and enforce commit message format plus the local check set.

## Pull Requests

Keep changes focused and include tests for scanner, renderer, writer, or CLI behavior when practical.

Minimap should stay deterministic, local-only by default, and conservative about file reads and writes.
