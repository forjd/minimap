#!/usr/bin/env bash
set -euo pipefail

version="${MINIMAP_RELEASE_VERSION:-$(bun -e 'import pkg from "./package.json"; console.log(pkg.version)')}"
release_dir="${MINIMAP_RELEASE_DIR:-dist/release}"
raw_dir="$release_dir/raw"
asset_dir="$release_dir/assets"

rm -rf "$release_dir"
mkdir -p "$raw_dir" "$asset_dir"

bun build --compile --minify --target=bun-darwin-arm64 src/cli.ts --outfile "$raw_dir/minimap-darwin-arm64"
bun build --compile --minify --target=bun-darwin-x64 src/cli.ts --outfile "$raw_dir/minimap-darwin-x64"
bun build --compile --minify --target=bun-linux-x64-baseline src/cli.ts --outfile "$raw_dir/minimap-linux-x64"
bun build --compile --minify --target=bun-linux-arm64 src/cli.ts --outfile "$raw_dir/minimap-linux-arm64"
bun build --compile --minify --target=bun-windows-x64-baseline src/cli.ts --outfile "$raw_dir/minimap-windows-x64.exe"

if [[ "$(uname -s)" == "Linux" && "$(uname -m)" == "x86_64" ]]; then
  "$raw_dir/minimap-linux-x64" --version
fi

tar -C "$raw_dir" -czf "$asset_dir/minimap-v${version}-darwin-arm64.tar.gz" minimap-darwin-arm64
tar -C "$raw_dir" -czf "$asset_dir/minimap-v${version}-darwin-x64.tar.gz" minimap-darwin-x64
tar -C "$raw_dir" -czf "$asset_dir/minimap-v${version}-linux-x64.tar.gz" minimap-linux-x64
tar -C "$raw_dir" -czf "$asset_dir/minimap-v${version}-linux-arm64.tar.gz" minimap-linux-arm64
zip -j "$asset_dir/minimap-v${version}-windows-x64.zip" "$raw_dir/minimap-windows-x64.exe"

(
  cd "$asset_dir"
  sha256sum ./* > SHA256SUMS
)
