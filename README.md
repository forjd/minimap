# Minimap

Deterministic repository context for coding agents.

[![CI](https://github.com/forjd/minimap/actions/workflows/ci.yml/badge.svg)](https://github.com/forjd/minimap/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@forjd/minimap.svg)](https://www.npmjs.com/package/@forjd/minimap)
[![npm provenance](https://img.shields.io/badge/npm-provenance-brightgreen.svg)](https://www.npmjs.com/package/@forjd/minimap)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Runtime: Bun](https://img.shields.io/badge/runtime-Bun-black.svg)](https://bun.sh)
[![Status: MVP](https://img.shields.io/badge/status-MVP-orange.svg)](#project-status)

Minimap scans a local repository, detects high-signal project facts, and writes a compact managed context block into files such as `AGENTS.md` and `CLAUDE.md`.

It is not a README generator. It is a deterministic context compiler for coding agents.

```bash
minimap scan
minimap generate
minimap write --target AGENTS.md
minimap check --target AGENTS.md
```

## Why Minimap?

Coding agents repeatedly rediscover the same repository basics:

- Which language, framework, and package manager is this?
- How should tests, linting, formatting, and type checks run?
- Is this Laravel, Vue, Inertia, Vite, Tailwind, Pest, PHPUnit, React, Next.js, or something else?
- Which commands are useful validation commands, and which commands should not be run without permission?
- What project conventions should an agent preserve before making changes?

Minimap turns those signals into durable, evidence-backed instructions.

```mermaid
flowchart LR
  A["Repository files"] --> B["minimap scan"]
  B --> C["agent context block"]
  C --> D["AGENTS.md / CLAUDE.md"]
  D --> E["minimap check"]
```

## Example Output

Minimap writes only inside its managed block:

```md
<!-- minimap:start -->

<repo_context generated_by="minimap" schema_version="1">

  <summary>
    Laravel + Vue/Inertia + TypeScript project using Composer, Bun, Pest, Vite, and Tailwind CSS.
  </summary>

  <stack>
    <language name="PHP" confidence="high" evidence="composer.json present" />
    <framework name="Laravel" confidence="high" evidence="laravel/framework dependency detected" />
    <framework name="Vue" confidence="high" evidence="vue dependency detected" />
    <tool name="Vite" confidence="high" evidence="vite dependency detected" />
  </stack>

  <commands>
    <command name="php_tests" value="composer test" confidence="medium" category="test" />
    <command name="frontend_build" value="bun run build" confidence="medium" category="build" />
  </commands>
</repo_context>
<!-- minimap:end -->
```

## Installation

Minimap is Bun-native.

Install automatically:

```bash
curl -fsSL https://raw.githubusercontent.com/forjd/minimap/main/install.sh | bash
```

Run with Bun:

```bash
bunx @forjd/minimap scan
```

Or install globally:

```bash
bun install -g @forjd/minimap
minimap --help
```

Prefer shorthand?

```bash
bun i -g @forjd/minimap
```

Standalone binaries are also attached to GitHub releases for environments where installing Bun is inconvenient:

```bash
gh release download --repo forjd/minimap --pattern 'minimap-v*-linux-x64.tar.gz' --pattern SHA256SUMS
sha256sum -c SHA256SUMS
tar -xzf minimap-v*-linux-x64.tar.gz
./minimap-linux-x64 --help
```

Downloads are available for macOS, Linux, and Windows from the latest GitHub release.

The installer can be made explicit for scripts:

```bash
curl -fsSL https://raw.githubusercontent.com/forjd/minimap/main/install.sh | INSTALL_METHOD=binary BIN_DIR="$HOME/.local/bin" bash
```

For local development:

```bash
git clone https://github.com/forjd/minimap.git
cd minimap
bun install
bun run src/cli.ts --help
```

## Agent Skill

Minimap ships a portable agent skill for agents that support the open skills format. It teaches agents to preview, write, and check Minimap-managed context blocks instead of editing them by hand.

Install it with the `skills` CLI:

```bash
npx skills add forjd/minimap --skill minimap
```

Or with Bun:

```bash
bunx skills add forjd/minimap --skill minimap
```

Install it for all detected agents:

```bash
npx skills add forjd/minimap --skill minimap --agent '*'
```

## Commands

### Scan

Scan the current repository and print detected signals as JSON:

```bash
minimap scan
minimap scan --pretty
minimap scan --cwd ./some-project
```

`scan` is read-only. To preview generated context, use `generate` or `write --dry-run`.

### Generate

Generate a managed context block without writing it:

```bash
minimap generate
minimap generate --profile agents
minimap generate --profile claude
```

The `agents` and `claude` profiles currently produce the same output. The profile option exists so output can diverge later.

### Write

Create or update a managed block in a target file:

```bash
minimap write --target AGENTS.md
minimap write --target CLAUDE.md
```

Preview the resulting file without writing:

```bash
minimap write --target AGENTS.md --dry-run
```

### Check

Detect context drift:

```bash
minimap check --target AGENTS.md
```

Use the same command in CI to keep checked-in agent instructions current:

```yaml
- name: Check agent context drift
  run: bunx @forjd/minimap check --target AGENTS.md
```

`check` exits:

- `0` when the managed block matches the current repository scan.
- `1` when the file is missing, the managed block is missing, multiple blocks are present, or the generated block has drifted.

## Safe Writes

Minimap uses stable markers:

```md
<!-- minimap:start -->

...

<!-- minimap:end -->
```

Write behavior is conservative:

- If the target file does not exist, Minimap creates it.
- If the target exists without a managed block, Minimap appends the block.
- If the target contains one managed block, Minimap replaces only that block.
- If multiple managed blocks are found, Minimap refuses to write.
- Human-authored content outside the managed block is preserved.

## Schema Version

Generated context uses `schema_version="1"` on the root `<repo_context>` element. Version 1 is the current stable XML-shaped Markdown block format: existing element names, attributes, marker comments, and exact drift checks should be treated as part of the contract.

Future schema changes should increment `schema_version` when they rename or remove elements, change attribute meanings, or make older generated blocks ambiguous for consumers. Add migration notes to this section when that happens, including what changed and whether downstream repositories should refresh blocks with `minimap write` or make manual edits.

## Safety Model

Minimap is local-only and deterministic.

It does not:

- call an LLM
- run project scripts during scan or generation
- evaluate JavaScript, TypeScript, PHP, or config files
- recursively summarize source files
- overwrite content outside the managed block
- send repository data to external services

It does:

- read targeted manifest and config files
- classify commands as validation, development, formatting, or risk signals
- mark destructive database, publishing, deployment, and volume deletion commands as risks
- include confidence and evidence for inferred facts

## Supported Signals

MVP detection covers:

- Node, JavaScript, and TypeScript via `package.json`
- Bun, pnpm, Yarn, and npm via lockfiles
- PHP and Composer via `composer.json`
- Laravel via `laravel/framework` or `artisan` plus `bootstrap/app.php`
- Vue, React, Next.js, Nuxt, Svelte, SvelteKit, Inertia, Vite, Tailwind CSS
- Vitest, Jest, Playwright, Cypress, Pest, PHPUnit
- ESLint, oxlint, Biome, Pint, PHPStan, Larastan
- shallow GitHub Actions workflow presence and names
- pnpm, npm, Yarn, and Bun workspace package manifests
- Turborepo, Nx, and Lerna monorepo configuration files

## Good For

- Maintaining `AGENTS.md` or `CLAUDE.md`
- Giving coding agents a fast repository orientation
- Keeping context blocks current with `minimap check`
- CI drift checks for agent instructions
- Avoiding repeated manual repo summaries

## Project Status

Minimap is an MVP.

Current limitations:

- Bun is the supported runtime.
- Node-compatible bundling is not a goal yet.
- Monorepo support detects root workspace configuration and package manifests, but does not deeply scan each package yet.
- Staleness checks compare the generated managed block exactly.
- The scanner intentionally avoids deep source parsing.

## Development

```bash
bun install
bun run format:check
bun run lint
bun run typecheck
bun test
```

Format changed files:

```bash
bun run format
```

The test suite uses fixture repositories and snapshots for generated output.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Releasing

See [RELEASING.md](RELEASING.md).

## Security

See [SECURITY.md](SECURITY.md).

## License

MIT, copyright Forjd.
