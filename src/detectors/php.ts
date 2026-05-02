import { z } from "zod";

import { commandSignalName, classifyCommand, isUsefulCommand } from "../core/command-classifier";
import type { Detector, RepoSignal } from "../core/signals";

const composerJsonSchema = z.object({
  require: z.record(z.string(), z.string()).optional(),
  "require-dev": z.record(z.string(), z.string()).optional(),
  scripts: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
});

type ComposerJson = z.infer<typeof composerJsonSchema>;

function depsOf(composer: ComposerJson): Record<string, string> {
  return Object.assign({}, composer.require, composer["require-dev"]);
}

export const detectPhp: Detector = async ({ files }) => {
  const rawComposer = await files.readJson<unknown>("composer.json");
  const parsedComposer = composerJsonSchema.safeParse(rawComposer);
  const composer = parsedComposer.success ? parsedComposer.data : null;
  const signals: RepoSignal[] = [];
  if (!composer) return signals;

  signals.push({
    kind: "language",
    name: "PHP",
    confidence: "high",
    source: "composer.json",
    evidence: "composer.json present",
  });
  signals.push({
    kind: "package-manager",
    name: "Composer",
    confidence: "high",
    source: "composer.json",
    evidence: "composer.json present",
  });

  const deps = depsOf(composer);
  if (deps.php) {
    signals.push({
      kind: "convention",
      name: "PHP version constraint",
      confidence: "high",
      source: "composer.json",
      evidence: `require.php is ${deps.php}`,
      metadata: { value: deps.php },
    });
  }

  const detected: Array<[string, string, RepoSignal["kind"]]> = [
    ["laravel/pint", "Laravel Pint", "tool"],
    ["pestphp/pest", "Pest", "test-framework"],
    ["phpunit/phpunit", "PHPUnit", "test-framework"],
    ["nunomaduro/larastan", "Larastan", "tool"],
    ["phpstan/phpstan", "PHPStan", "tool"],
    ["spatie/laravel-data", "Spatie Laravel Data", "tool"],
    ["spatie/laravel-event-sourcing", "Spatie Event Sourcing", "architecture"],
    ["laravel/sail", "Laravel Sail", "tool"],
    ["laravel/reverb", "Laravel Reverb", "tool"],
    ["inertiajs/inertia-laravel", "Inertia Laravel", "tool"],
  ];

  for (const [dependency, name, kind] of detected) {
    if (deps[dependency]) {
      signals.push({
        kind,
        name,
        confidence: "high",
        source: "composer.json",
        evidence: `${dependency} dependency detected`,
      });
    }
  }

  for (const [name, rawValue] of Object.entries(composer.scripts ?? {})) {
    const value = Array.isArray(rawValue) ? rawValue.join(" && ") : rawValue;
    if (!isUsefulCommand(name, value)) continue;
    const category = classifyCommand(name, value);
    signals.push({
      kind: category === "dangerous" ? "risk" : "command",
      name: commandSignalName("php", name, value),
      confidence: category === "dangerous" ? "high" : "medium",
      source: "composer.json",
      evidence: `script "${name}": ${value}`,
      metadata: { value: `composer ${name}`, category, script: name },
    });
  }

  return signals;
};
