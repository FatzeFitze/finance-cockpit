#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
codex_bin="${CODEX_WSL_BIN:-$HOME/.local/bin/codex}"
node_bin_dir="${CODEX_WSL_NODE_BIN_DIR:-$HOME/.local/bin}"

if [[ ! -x "$codex_bin" ]]; then
  printf 'Native WSL Codex was not found at %s.\n' "$codex_bin" >&2
  printf 'See docs/development-environment.md for installation and recovery instructions.\n' >&2
  exit 1
fi

export PATH="$node_bin_dir:$PATH"

if ! "$codex_bin" login status >/dev/null 2>&1; then
  printf 'Native WSL Codex is not authenticated. Run:\n' >&2
  printf '  PATH="$HOME/.local/bin:$PATH" "$HOME/.local/bin/codex" login --device-auth\n' >&2
  exit 1
fi

exec "$codex_bin" -C "$repo_root" "$@"

