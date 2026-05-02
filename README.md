# Minimap

Minimap is a Bun + TypeScript CLI that compiles high-signal repository facts into durable agent instructions.

It scans local project manifests and config files, infers the stack, package managers, commands, testing tools, and important conventions, then writes a managed block into files such as `AGENTS.md` or `CLAUDE.md`.

It is intentionally not a README generator. Minimap produces compact, deterministic context for coding agents.

## Install

From source:

```bash
git clone https://github.com/forjd/minimap.git
cd minimap
bun install
```

Run without linking:

```bash
bun run src/cli.ts --help
```

Link the binary during development:

```bash
bun link
minimap --help
```

When Minimap is published to a package registry, it will be usable through the package runner for that registry. Until then, source checkout is the supported install path.

## Commands

Scan the current repository and print detected signals:

```bash
minimap scan
minimap scan --pretty
minimap scan --cwd ./some-project
```

Generate the managed context block:

```bash
minimap generate
minimap generate --profile agents
minimap generate --profile claude
```

Write or update a managed block:

```bash
minimap write --target AGENTS.md
minimap write --target CLAUDE.md
minimap write --target AGENTS.md --dry-run
```

Check whether a target block is current:

```bash
minimap check --target AGENTS.md
```

`check` exits `0` when the block matches the current repository scan. It exits `1` when the file is missing, the managed block is missing, multiple blocks are present, or the generated block has drifted.

## Managed Block

Minimap only writes content between stable markers:

```md
<!-- minimap:start -->

<repo_context generated_by="minimap" schema_version="1">
...
</repo_context>

<!-- minimap:end -->
```

If the target file does not exist, Minimap creates it. If the target exists without a managed block, Minimap appends the block. If the target contains one managed block, Minimap replaces only that block. If multiple managed blocks are found, Minimap refuses to write.

## Supported Signals

MVP detection covers:

- Node, JavaScript, and TypeScript via `package.json`.
- Bun, pnpm, Yarn, and npm via lockfiles.
- PHP and Composer via `composer.json`.
- Laravel via `laravel/framework` or `artisan` plus `bootstrap/app.php`.
- Vue, React, Next.js, Nuxt, Svelte, SvelteKit, Inertia, Vite, Tailwind CSS.
- Vitest, Jest, Playwright, Cypress, Pest, PHPUnit.
- ESLint, oxlint, Biome, Pint, PHPStan, Larastan.
- Shallow GitHub Actions workflow presence and names.

## Safety Model

Minimap is local-only and deterministic.

- It does not call an LLM.
- It does not run project scripts during scan or generation.
- It does not evaluate JavaScript, TypeScript, PHP, or config files.
- It reads only targeted manifest/config files and shallow workflow files.
- It refuses writes when managed block state is ambiguous.
- It classifies dangerous commands such as database resets, publishing, deployment, and volume deletion as risks instead of validation commands.

## Development

```bash
bun test
bun run lint
bun run typecheck
bun run format
```

The test suite uses fixture repositories and snapshots for generated output.

## Project Status

Minimap is an MVP. It supports a focused set of Node, TypeScript, PHP, Laravel, and frontend ecosystem signals. It does not deeply parse source code, execute project commands, call external services, or use an LLM.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).

## License

MIT, copyright Forjd.
