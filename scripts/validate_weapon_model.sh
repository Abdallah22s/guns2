#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MODEL_FILE="$ROOT_DIR/wepapp/yolov8n.pt"

err() {
  echo "[MODEL-ERROR] $1" >&2
}

if [[ ! -f "$MODEL_FILE" ]]; then
  err "YOLOv8 weights not found: $MODEL_FILE"
  cat >&2 <<'EOF'
[MODEL-FIX] Weapon model weights are not available locally.
[MODEL-FIX] This repository stores model assets via Git LFS.
[MODEL-FIX] Team setup steps:
  1) Install git-lfs on your machine.
  2) Run:
       git lfs install
       git lfs pull --include="wepapp/yolov8n.pt"
  3) Re-run the project.
EOF
  exit 1
fi

echo "[MODEL-OK] YOLOv8 weights found: $MODEL_FILE"

