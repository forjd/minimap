#!/usr/bin/env bash
set -euo pipefail

repo="forjd/minimap"
package="@forjd/minimap"
install_method="${INSTALL_METHOD:-auto}"
version="${VERSION:-latest}"
tmp_dir=""

info() {
  printf '%s\n' "$*"
}

fail() {
  printf 'minimap install: %s\n' "$*" >&2
  exit 1
}

has() {
  command -v "$1" >/dev/null 2>&1
}

run_bun_install() {
  info "Installing minimap with Bun..."
  bun install -g "$package"
  minimap --version
}

prompt_for_bun() {
  if [[ ! -r /dev/tty || ! -w /dev/tty ]]; then
    return 1
  fi

  printf 'Bun is not installed. Install Bun now? [y/N] ' >/dev/tty
  read -r answer </dev/tty
  case "$answer" in
    y | Y | yes | YES)
      curl -fsSL https://bun.sh/install | bash
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

resolve_latest_version() {
  local tag

  tag="$(curl -fsSL "https://api.github.com/repos/${repo}/releases/latest" | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -n 1)"
  [[ -n "$tag" ]] || fail "could not resolve latest GitHub release"
  printf '%s\n' "${tag#v}"
}

detect_target() {
  local os arch

  case "$(uname -s)" in
    Darwin) os="darwin" ;;
    Linux) os="linux" ;;
    MINGW* | MSYS* | CYGWIN*) os="windows" ;;
    *) fail "unsupported OS: $(uname -s)" ;;
  esac

  case "$(uname -m)" in
    arm64 | aarch64) arch="arm64" ;;
    x86_64 | amd64) arch="x64" ;;
    *) fail "unsupported architecture: $(uname -m)" ;;
  esac

  if [[ "$os" == "windows" && "$arch" != "x64" ]]; then
    fail "unsupported Windows architecture: $(uname -m)"
  fi

  printf '%s-%s\n' "$os" "$arch"
}

default_bin_dir() {
  if [[ -n "${BIN_DIR:-}" ]]; then
    printf '%s\n' "$BIN_DIR"
  elif [[ -d /usr/local/bin && -w /usr/local/bin ]]; then
    printf '%s\n' /usr/local/bin
  else
    printf '%s\n' "$HOME/.local/bin"
  fi
}

verify_checksum() {
  local sums_file="$1"
  local archive="$2"

  if has sha256sum; then
    grep -F " ${archive}" "$sums_file" | sha256sum -c -
  elif has shasum; then
    grep -F " ${archive}" "$sums_file" | shasum -a 256 -c -
  else
    fail "sha256sum or shasum is required to verify downloads"
  fi
}

run_binary_install() {
  has curl || fail "curl is required for binary install"

  local resolved_version target archive binary_name url bin_dir installed_name

  resolved_version="$version"
  if [[ "$resolved_version" == "latest" ]]; then
    resolved_version="$(resolve_latest_version)"
  else
    resolved_version="${resolved_version#v}"
  fi

  target="$(detect_target)"
  if [[ "$target" == windows-* ]]; then
    has unzip || fail "unzip is required to install the Windows binary"
    archive="minimap-v${resolved_version}-${target}.zip"
    binary_name="minimap-${target}.exe"
    installed_name="minimap.exe"
  else
    has tar || fail "tar is required to install the binary archive"
    archive="minimap-v${resolved_version}-${target}.tar.gz"
    binary_name="minimap-${target}"
    installed_name="minimap"
  fi

  url="https://github.com/${repo}/releases/download/v${resolved_version}"
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT

  info "Downloading ${archive}..."
  curl -fsSL "${url}/${archive}" -o "${tmp_dir}/${archive}"
  curl -fsSL "${url}/SHA256SUMS" -o "${tmp_dir}/SHA256SUMS"

  (
    cd "$tmp_dir"
    verify_checksum SHA256SUMS "./${archive}"
  )

  if [[ "$archive" == *.zip ]]; then
    unzip -q "$tmp_dir/$archive" -d "$tmp_dir"
  else
    tar -C "$tmp_dir" -xzf "$tmp_dir/$archive"
  fi

  bin_dir="$(default_bin_dir)"
  mkdir -p "$bin_dir"
  install -m 0755 "$tmp_dir/$binary_name" "$bin_dir/$installed_name"

  info "Installed minimap to ${bin_dir}/${installed_name}"
  "${bin_dir}/${installed_name}" --version
}

case "$install_method" in
  auto)
    if has bun; then
      run_bun_install
    else
      if prompt_for_bun && [[ -x "$HOME/.bun/bin/bun" ]]; then
        export PATH="$HOME/.bun/bin:$PATH"
        run_bun_install
      else
        info "Falling back to the standalone GitHub release binary."
        run_binary_install
      fi
    fi
    ;;
  bun)
    has bun || fail "Bun is required when INSTALL_METHOD=bun"
    run_bun_install
    ;;
  binary)
    run_binary_install
    ;;
  *)
    fail "INSTALL_METHOD must be auto, bun, or binary"
    ;;
esac
