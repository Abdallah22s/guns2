#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MODEL_DIR="$ROOT_DIR/wepapp/weaponresource/checkpoints_weapon"

err() {
  echo "[MODEL-ERROR] $1" >&2
}

is_lfs_pointer() {
  local f="$1"
  head -n 1 "$f" 2>/dev/null | grep -q "version https://git-lfs.github.com/spec/v1"
}

check_model_dir() {
  local dir="$1"
  local vars_file="$dir/variables/variables.data-00000-of-00001"
  local saved_model="$dir/saved_model.pb"

  if [[ ! -f "$vars_file" || ! -f "$saved_model" ]]; then
    err "missing required model files in: $dir"
    return 1
  fi

  if is_lfs_pointer "$vars_file"; then
    err "LFS pointer detected (not real weights): $vars_file"
    return 1
  fi

  local size
  size=$(wc -c < "$vars_file")
  if [[ "$size" -lt 1048576 ]]; then
    err "weights file is too small (${size} bytes), likely incomplete: $vars_file"
    return 1
  fi

  return 0
}

if [[ ! -d "$MODEL_DIR" ]]; then
  err "model directory not found: $MODEL_DIR"
  exit 1
fi

ok=false
for d in "$MODEL_DIR"/*; do
  [[ -d "$d" ]] || continue
  if check_model_dir "$d"; then
    echo "[MODEL-OK] valid model found: $d"
    ok=true
    break
  fi
done

if [[ "$ok" != "true" ]]; then
  cat >&2 <<'EOF'
[MODEL-FIX] Weapon model weights are not available locally.
[MODEL-FIX] This repository stores model assets via Git LFS.
[MODEL-FIX] Team setup steps:
  1) Install git-lfs on your machine.
  2) Run:
       git lfs install
       git lfs pull --include="wepapp/weaponresource/checkpoints_weapon/**"
  3) Re-run the project.
EOF
  exit 1
fi

