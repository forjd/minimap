import type { Detector, RepoSignal } from "../core/signals";

export const detectDeployment: Detector = async ({ files }) => {
  const signals: RepoSignal[] = [];

  const platforms: Array<[string, string, string]> = [
    ["vercel.json", "Vercel", "vercel.json present"],
    ["netlify.toml", "Netlify", "netlify.toml present"],
    ["wrangler.toml", "Cloudflare Workers", "wrangler.toml present"],
    ["wrangler.jsonc", "Cloudflare Workers", "wrangler.jsonc present"],
    ["fly.toml", "Fly.io", "fly.toml present"],
    ["Procfile", "Heroku", "Procfile present"],
    ["Chart.yaml", "Helm", "Chart.yaml present"],
  ];

  for (const [path, name, evidence] of platforms) {
    if (!files.exists(path)) continue;
    signals.push({
      kind: "tool",
      name,
      confidence: "high",
      source: path,
      evidence,
    });
  }

  const kubernetesFiles = await files.listFiles([
    "k8s/*.yaml",
    "k8s/*.yml",
    "kubernetes/*.yaml",
    "kubernetes/*.yml",
  ]);
  if (kubernetesFiles.length > 0) {
    signals.push({
      kind: "tool",
      name: "Kubernetes",
      confidence: "high",
      source: kubernetesFiles[0] ?? "k8s",
      evidence: "Kubernetes manifest present",
    });
  }

  return signals;
};
