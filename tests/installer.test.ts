import { describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

async function writeExecutable(path: string, content: string) {
  await writeFile(path, content);
  await chmod(path, 0o755);
}

describe("installer", () => {
  test("binary install uses mocked release metadata and checksums", async () => {
    const dir = await mkdtemp(join(tmpdir(), "minimap-installer-"));
    const binDir = join(dir, "bin");
    const installDir = join(dir, "install");
    await mkdir(binDir);

    try {
      await writeExecutable(
        join(binDir, "uname"),
        `#!/usr/bin/env bash
if [[ "$1" == "-s" ]]; then
  printf 'Linux\\n'
else
  printf 'x86_64\\n'
fi
`,
      );
      await writeExecutable(
        join(binDir, "curl"),
        `#!/usr/bin/env bash
if [[ "$*" == *"/releases/latest"* ]]; then
  printf '{"tag_name":"v9.9.9"}\\n'
  exit 0
fi

out=""
while [[ "$#" -gt 0 ]]; do
  if [[ "$1" == "-o" ]]; then
    out="$2"
    shift 2
    continue
  fi
  shift
done

if [[ "$out" == *"SHA256SUMS" ]]; then
  printf 'abc  ./minimap-v9.9.9-linux-x64.tar.gz\\n' > "$out"
else
  printf 'archive' > "$out"
fi
`,
      );
      await writeExecutable(
        join(binDir, "sha256sum"),
        `#!/usr/bin/env bash
cat >/dev/null
exit 0
`,
      );
      await writeExecutable(
        join(binDir, "tar"),
        `#!/usr/bin/env bash
while [[ "$#" -gt 0 ]]; do
  if [[ "$1" == "-C" ]]; then
    target="$2"
    shift 2
    continue
  fi
  shift
done
printf '#!/usr/bin/env bash\\nprintf "9.9.9\\\\n"\\n' > "$target/minimap-linux-x64"
chmod +x "$target/minimap-linux-x64"
`,
      );

      const result = Bun.spawnSync(["bash", "install.sh"], {
        cwd: join(import.meta.dir, ".."),
        env: {
          ...process.env,
          INSTALL_METHOD: "binary",
          BIN_DIR: installDir,
          PATH: `${binDir}:/usr/bin:/bin`,
        },
        stdout: "pipe",
        stderr: "pipe",
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain("Downloading minimap-v9.9.9-linux-x64.tar.gz");
      expect(result.stdout.toString()).toContain(`Installed minimap to ${installDir}/minimap`);
      expect(result.stdout.toString()).toContain("9.9.9");
      expect(await Bun.file(join(installDir, "minimap")).exists()).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
