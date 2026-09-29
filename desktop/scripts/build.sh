#!/usr/bin/env bash
# Build the packaged LibreOffice JS desktop app.
#
#   Usage: ./desktop/scripts/build.sh
#
# The script:
#   1. Installs the frontend dependencies (npm ci).
#   2. Type-checks and runs the unit tests (src/**/qa).
#   3. Builds the Tauri application (which runs `vite build` first).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DESKTOP="$ROOT/desktop"

echo "==> Installing frontend dependencies..."
(cd "$DESKTOP" && npm ci)

echo "==> Running unit tests..."
(cd "$DESKTOP" && npm test)

echo "==> Building LibreOffice JS Tauri app..."
(cd "$DESKTOP" && npx tauri build)

echo "==> Done."
