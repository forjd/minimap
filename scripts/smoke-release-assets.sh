#!/usr/bin/env bash
set -euo pipefail

version="${MINIMAP_RELEASE_VERSION:-$(bun -e 'import pkg from "./package.json"; console.log(pkg.version)')}"
release_dir="${MINIMAP_RELEASE_DIR:-dist/release}"
asset_dir="$release_dir/assets"

require_asset() {
  local asset="$1"
  [[ -f "$asset_dir/$asset" ]] || {
    printf 'missing release asset: %s\n' "$asset" >&2
    exit 1
  }
}

require_asset "minimap-v${version}-darwin-arm64.tar.gz"
require_asset "minimap-v${version}-darwin-x64.tar.gz"
require_asset "minimap-v${version}-linux-arm64.tar.gz"
require_asset "minimap-v${version}-linux-x64.tar.gz"
require_asset "minimap-v${version}-windows-x64.zip"
require_asset "SHA256SUMS"

(
  cd "$asset_dir"
  sha256sum -c SHA256SUMS
)

tar -tzf "$asset_dir/minimap-v${version}-darwin-arm64.tar.gz" | grep -Fx minimap-darwin-arm64 >/dev/null
tar -tzf "$asset_dir/minimap-v${version}-darwin-x64.tar.gz" | grep -Fx minimap-darwin-x64 >/dev/null
tar -tzf "$asset_dir/minimap-v${version}-linux-arm64.tar.gz" | grep -Fx minimap-linux-arm64 >/dev/null
tar -tzf "$asset_dir/minimap-v${version}-linux-x64.tar.gz" | grep -Fx minimap-linux-x64 >/dev/null
unzip -l "$asset_dir/minimap-v${version}-windows-x64.zip" | grep -F minimap-windows-x64.exe >/dev/null

if [[ "$(uname -s)" == "Linux" && "$(uname -m)" == "x86_64" ]]; then
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT
  tar -C "$tmp_dir" -xzf "$asset_dir/minimap-v${version}-linux-x64.tar.gz"
  "$tmp_dir/minimap-linux-x64" --version
fi
