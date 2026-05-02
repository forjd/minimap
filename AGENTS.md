# Repository Instructions

- Do not manually edit content inside the Minimap managed block below. Refresh it with `bun run src/cli.ts write --target AGENTS.md`.
- Use Bun for local development and validation.
- Use Conventional Commits for commit messages.
- Before handing off code changes, run the relevant checks from the managed command list. For broad changes, prefer `bun run format:check`, `bun run lint`, `bun run typecheck`, and `bun test`.
- Keep Minimap deterministic, local-only by default, and conservative about file reads and writes.

<!-- minimap:start -->
<repo_context generated_by="minimap" schema_version="1">
  <summary>
    TypeScript project using Bun.
  </summary>

  <stack>
    <language name="JavaScript" confidence="high" evidence="package.json present" />
    <language name="TypeScript" confidence="high" evidence="typescript dependency detected" />
    <tool name="oxlint" confidence="high" evidence="oxlint dependency detected" />
  </stack>

  <package_managers>
    <manager name="Bun" confidence="high" evidence="bun.lock present" />
  </package_managers>

  <commands>
    <command name="frontend_dev" value="bun run dev" confidence="medium" category="dev" />
    <command name="frontend_dev" value="bun run prepare" confidence="medium" category="dev" />
    <command name="frontend_format" value="bun run format" confidence="medium" category="format" />
    <command name="frontend_lint" value="bun run format:check" confidence="medium" category="lint" />
    <command name="frontend_lint" value="bun run lint" confidence="medium" category="lint" />
    <command name="test" value="bun run coverage" confidence="medium" category="test" />
    <command name="test" value="bun run test" confidence="medium" category="test" />
    <command name="typecheck" value="bun run typecheck" confidence="medium" category="typecheck" />
  </commands>

  <project_conventions>
    <item>Use ES module syntax consistently with package.json type=module.</item>
  </project_conventions>

  <agent_guidance>
    <rule>Inspect nearby files before introducing new patterns.</rule>
    <rule>Prefer existing project conventions over generic framework defaults.</rule>
    <rule>When changing behaviour, add or update tests where practical.</rule>
  </agent_guidance>

  <evidence>
    <item source="package.json">Detected JavaScript: package.json present.</item>
    <item source="package.json">Detected TypeScript: typescript dependency detected.</item>
    <item source="package.json">Detected oxlint: oxlint dependency detected.</item>
    <item source="bun.lock">Detected Bun: bun.lock present.</item>
    <item source="package.json">Detected ES modules: type is "module".</item>
  </evidence>

</repo_context>
<!-- minimap:end -->
