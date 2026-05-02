import { z } from "zod";

import type { Detector, RepoSignal } from "../core/signals";

const composerJsonSchema = z.object({
  require: z.record(z.string(), z.string()).optional(),
  "require-dev": z.record(z.string(), z.string()).optional(),
});

type ComposerJson = z.infer<typeof composerJsonSchema>;

export const detectLaravel: Detector = async ({ files }) => {
  const rawComposer = await files.readJson<unknown>("composer.json");
  const parsedComposer = composerJsonSchema.safeParse(rawComposer);
  const composer: ComposerJson | null = parsedComposer.success ? parsedComposer.data : null;
  const deps = Object.assign({}, composer?.require, composer?.["require-dev"]);
  const hasDependency = Boolean(deps["laravel/framework"]);
  const hasFiles = files.exists("artisan") && files.exists("bootstrap/app.php");

  if (!hasDependency && !hasFiles) return [];

  const signals: RepoSignal[] = [
    {
      kind: "framework",
      name: "Laravel",
      confidence: hasDependency ? "high" : "medium",
      source: hasDependency ? "composer.json" : "artisan",
      evidence: hasDependency
        ? "laravel/framework dependency detected"
        : "artisan and bootstrap/app.php present",
    },
    {
      kind: "convention",
      name: "Laravel conventions",
      confidence: "medium",
      source: hasDependency ? "composer.json" : "bootstrap/app.php",
      evidence: "Laravel project detected",
    },
  ];

  return signals;
};
