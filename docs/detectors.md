# Detector Guide

Minimap detectors turn local repository files into evidence-backed `RepoSignal` objects. They are intentionally shallow: read manifests and config files, infer durable facts, and avoid executing project code.

Use this guide when adding or changing detection behavior.

## Scanner Flow

`scanRepo` in `src/core/scan-repo.ts` runs each detector against a shared `RepoFileMap`, flattens the results, removes duplicate signals, sorts them, and returns a `RepoScan`.

Detectors currently run in parallel. They must not depend on another detector having already run, and they should not mutate shared state except for adding warnings through the provided `warnings` array when a file cannot be interpreted safely.

## Signal Contract

Every signal must include:

- `kind`: one of the `SignalKind` values in `src/core/signals.ts`
- `name`: a stable human-readable name, such as `TypeScript`, `Laravel`, or `Docker`
- `confidence`: `high`, `medium`, or `low`
- `source`: a repository-relative POSIX path
- `evidence`: a concise fact that explains the inference
- `metadata`: optional structured detail for renderers, such as command value and category

Use `high` when a manifest, lockfile, or explicit config directly proves the fact. Use `medium` when a config file or source import strongly suggests the fact but is not a package declaration. Use `low` only for weak fallback assumptions, such as npm when only `package.json` exists and no lockfile is present.

Keep names stable because generated blocks are committed and checked for drift exactly by default.

## File Access

Use only the `RepoFileMap` methods passed to the detector:

- `exists(path)` for targeted presence checks
- `readText(path)` for bounded text reads
- `readJson(path)` for JSON manifests
- `listFiles(patterns)` for shallow glob checks

Do not use raw filesystem APIs inside detectors. `RepoFileMap` keeps reads inside the repository, caps text reads at 256 KB, caches reads, and records files that were inspected.

Prefer targeted manifests over broad source scans. When source scans are necessary, keep patterns narrow and cap any follow-up reads.

## Command Detection

Commands should be useful for agents and conservative by default. Node and PHP package scripts go through `src/core/command-classifier.ts`, which classifies validation, development, build, preview, deployment, and dangerous commands.

Only emit command signals for commands an agent could reasonably run or consider during development. Dangerous commands must be emitted as `risk` signals, not regular `command` signals.

For ecosystem detectors that synthesize commands, prefer standard read-only or validation commands:

- tests, such as `cargo test`, `go test ./...`, or `dotnet test`
- format checks when available, such as `cargo fmt --check`
- static analysis only when an explicit dependency or config is present

Avoid inventing project-specific commands from weak evidence.

## Adding a Detector

1. Add or update a detector under `src/detectors/`.
2. Register it in the `detectors` array in `src/core/scan-repo.ts`.
3. Add a contract case in `tests/detector-contract.test.ts`.
4. Add or update a fixture under `tests/fixtures/` when generated output should change.
5. Update snapshot expectations with `bun test -u` if the rendered context intentionally changes.
6. Update the README supported-signals list when the user-visible coverage changes.

The detector contract test checks determinism, valid signal kinds, valid confidence values, non-empty evidence, and safe repository-relative source paths.

## Output Compatibility

The generated block is schema versioned in `README.md` and compared exactly by `minimap check` unless `--normalized` is used. Treat element names, signal names, command names, metadata-driven command values, and evidence phrasing as user-visible output.

Schema changes should be rare. Increment `schema_version` only when existing generated blocks would become ambiguous or incompatible for downstream consumers.
