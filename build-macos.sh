#!/usr/bin/env bash

set -euo pipefail

echo "=========================================================="
echo "  Foreigners Studio - macOS Enterprise Bundle Builder     "
echo "=========================================================="

command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required but not installed." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "Error: npm is required but not installed." >&2; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo "Error: Rust/Cargo is required but not installed." >&2; exit 1; }

echo "[1/5] Installing NPM dependencies..."
npm install

echo "[2/5] Compiling and verifying React TypeScript frontend..."
npm run build

echo "[3/5] Ensuring Apple Silicon and Intel Rust target toolchains..."
rustup target add aarch64-apple-darwin x86_64-apple-darwin || true

echo "[4/5] Building hardened macOS universal application & DMG installer..."
npm run tauri build -- --target universal-apple-darwin --bundles dmg,app
bash clean-dmg.sh

echo "[5/5] Copying release bundle (.dmg & .app) into dist-release/..."
node copy-release.js
bash clean-dmg.sh

echo "=========================================================="
echo "  BUILD COMPLETE: DMG and App bundle copied to Macos/     "
echo "=========================================================="
