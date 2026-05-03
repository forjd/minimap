# Roadmap

Minimap is a healthy MVP: a deterministic Bun-native TypeScript CLI with conservative local file reads, managed-block writing, drift checking, broad detector coverage, release automation, and a packaged Codex skill.

The current foundation is intentionally small. The next work should strengthen the core promise before expanding too far: keep repository context deterministic, evidence-backed, safe to refresh, and useful to coding agents without making Minimap a general README generator.

## Current State

- Core scanner runs a fixed detector pipeline and sorts/deduplicates signals deterministically.
- File reads and writes are confined to the target repository, including symlink checks.
- Managed blocks are rendered with stable markers and only replaced inside those markers.
- Tests cover detector behavior, command behavior, managed-block behavior, file safety, snapshots, and CI detection.
- CI runs formatting, linting, type checking, and coverage.
- Release automation publishes npm packages and standalone binaries.

Known MVP limitations:

- Bun is the supported runtime.
- Node-compatible bundling is not a goal yet.
- Monorepo support detects root workspace configuration and package manifests, but does not deeply scan each package yet.
- Staleness checks compare the generated managed block exactly.
- The scanner intentionally avoids deep source parsing.

## Phase 1: Tighten The MVP

Goal: make the existing product loop more reliable and easier to trust.

- [x] Add `minimap check --target AGENTS.md` to this repository's CI and document the same pattern for downstream repositories.
- [x] Improve drift output so stale blocks show a compact, actionable diff instead of only reporting drift.
- [x] Add snapshot coverage for this repository's own generated `AGENTS.md` managed block.
- [x] Expand risky command classification for common destructive operations:
  - [x] Prisma migrations and resets
  - [x] Rails database resets
  - [x] `kubectl delete`
  - [x] `terraform destroy`
  - [x] Docker volume pruning
- [x] Add a detector contract test helper so each detector proves deterministic output, evidence, confidence, and safe file access.

## Phase 2: Better Repository Coverage

Goal: increase usefulness across real repositories while preserving shallow, deterministic scanning.

- [x] Deepen monorepo support by scanning manifests under detected workspaces and summarizing per-workspace stack signals.
- [x] Keep workspace output capped and deterministic for large repositories.
- [x] Detect Python validation commands from `pyproject.toml`, uv, Poetry, pytest, Ruff, MyPy, and common scripts where available.
- [x] Add command hints for Go, Rust, Java, .NET, and Ruby from canonical manifest files where this can be done without running code.
- [ ] Improve framework coverage for common agent-facing stacks:
  - [ ] Astro
  - [ ] Remix
  - [ ] Angular
  - [ ] Tauri
  - [ ] Rails
  - [ ] Django
  - [ ] FastAPI
  - [ ] Cloudflare Workers
- [ ] Add focused fixtures for each new ecosystem or framework signal.

## Phase 3: Output Quality And Compatibility

Goal: make rendered context more stable, expressive, and adaptable to agent targets.

- [ ] Document `schema_version` expectations and add migration notes for future schema changes.
- [ ] Make profiles diverge where useful instead of keeping `agents` and `claude` identical indefinitely.
- [ ] Consider additional explicit profiles for common agent instruction targets.
- [ ] Evaluate `generate --format json|xml|markdown` only if there is a concrete consumer need.
- [ ] Add configurable evidence and workspace rendering limits with stable defaults.
- [ ] Consider a normalized check mode that ignores harmless whitespace or ordering churn while preserving exact mode as the default.

## Phase 4: Distribution And Adoption

Goal: make installation, release, and ongoing adoption boring.

- [ ] Add installer tests with mocked release metadata and checksum files.
- [ ] Add release binary smoke tests across the supported platforms where practical.
- [ ] Improve the packaged Minimap skill with concrete preview, write, and check examples.
- [ ] Publish a short CI drift-check recipe.
- [ ] Add comparison docs explaining when to use Minimap versus hand-authored project instructions.

## Suggested Next Issues

1. `feat: add AGENTS.md drift check guidance and repo CI check`
2. `feat: improve stale block diff output`
3. `feat: summarize detected workspace package stacks`

Start with drift-check UX and CI. It directly supports Minimap's core promise and has lower implementation risk than deep workspace scanning.
