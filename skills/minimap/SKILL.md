---
name: minimap
description: Use this skill when working in a software repository and you need to create, update, preview, or verify deterministic agent context with Minimap in AGENTS.md, CLAUDE.md, or another agent instruction file.
---

# Minimap

Minimap compiles repository facts into a compact managed context block for coding agents. Use it instead of manually summarizing stack, tooling, validation commands, and risk signals.

## Workflow

1. Inspect the current repository target file if one exists, such as `AGENTS.md` or `CLAUDE.md`.
2. Preview Minimap output before writing:

```bash
bunx @forjd/minimap generate
bunx @forjd/minimap write --target AGENTS.md --dry-run
```

3. Write the managed block only after the preview fits the task:

```bash
bunx @forjd/minimap write --target AGENTS.md
```

4. Verify drift after writing or when reviewing an existing file:

```bash
bunx @forjd/minimap check --target AGENTS.md
```

## Rules

- Never hand-edit content inside `<!-- minimap:start -->` and `<!-- minimap:end -->`.
- Preserve all human-authored content outside the managed block.
- Use `write --dry-run` when the user asks what would change.
- Use `check` in CI or review workflows to detect stale agent context.
- If the target file has multiple Minimap blocks, stop and report the issue instead of trying to repair it manually.

## Commands

Use these commands from the repository root unless a different working directory is required:

```bash
bunx @forjd/minimap scan --pretty
bunx @forjd/minimap generate --profile agents
bunx @forjd/minimap generate --profile claude
bunx @forjd/minimap write --target AGENTS.md
bunx @forjd/minimap write --target CLAUDE.md
bunx @forjd/minimap check --target AGENTS.md
```

## Examples

Preview an `AGENTS.md` refresh without writing:

```bash
bunx @forjd/minimap write --target AGENTS.md --dry-run
```

Write a Claude-specific block:

```bash
bunx @forjd/minimap write --target CLAUDE.md --profile claude
```

Check drift in CI:

```yaml
- name: Check agent context drift
  run: bunx @forjd/minimap check --target AGENTS.md
```

Check a block that was intentionally rendered with limits:

```bash
bunx @forjd/minimap check --target AGENTS.md --workspace-limit 20 --evidence-limit 8
```

If Bun is unavailable, `npx @forjd/minimap --help` can be used for basic CLI access, but Bun is the supported runtime.

## Safety Model

Minimap is deterministic and local-only. It reads targeted manifest and config files, does not call an LLM, does not run project scripts, and writes only between its managed markers.
