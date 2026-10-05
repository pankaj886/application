#!/usr/bin/env bash
set -eo pipefail

if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "==> clean-dmg.sh: Non-macOS environment ($OSTYPE). Skipping."
  exit 0
fi

echo "=========================================================="
echo "  Foreigners Studio - macOS DMG Sanitizer & Code-Signer   "
echo "=========================================================="

SEARCH_DIRS=()
[ -d "src-tauri/target" ] && SEARCH_DIRS+=("src-tauri/target")
[ -d "dist-release" ]     && SEARCH_DIRS+=("dist-release")

if [ ${#SEARCH_DIRS[@]} -eq 0 ]; then
  echo "No target or release directories found."
  exit 0
fi

SIGN_ID="${APPLE_SIGNING_IDENTITY:--}"
echo "==> Using Code Signing Identity: $SIGN_ID"

TIMESTAMP_FLAG=""
if [ "$SIGN_ID" != "-" ]; then
  TIMESTAMP_FLAG="--timestamp"
fi

ENTITLEMENTS_FLAG=""
if [ -f "src-tauri/Entitlements.plist" ]; then
  ENTITLEMENTS_FLAG="--entitlements src-tauri/Entitlements.plist"
fi

sign_app_bundle() {
  local target_app="$1"
  [ -d "$target_app" ] || return 0
  echo "==> Signing: $target_app (Identity: $SIGN_ID)"

  xattr -cr "$target_app" 2>/dev/null || true

  xattr -d com.apple.quarantine "$target_app" 2>/dev/null || true

  find "$target_app" -type f \( -name "*.dylib" -o -name "*.so" \) 2>/dev/null | while read -r lib; do
    codesign --force $TIMESTAMP_FLAG --options runtime --sign "$SIGN_ID" "$lib" 2>/dev/null || true
  done

  codesign --force --deep $TIMESTAMP_FLAG --options runtime $ENTITLEMENTS_FLAG --sign "$SIGN_ID" "$target_app" 2>/dev/null || \
    codesign --force --deep $ENTITLEMENTS_FLAG --sign "$SIGN_ID" "$target_app" 2>/dev/null || \
    codesign --force --deep --sign "$SIGN_ID" "$target_app" 2>/dev/null || true

  if codesign --verify --deep --strict "$target_app" 2>/dev/null; then
    echo "  ✓ Code signature verified: $(basename "$target_app")"
  else
    echo "  ⚠ Could not strictly verify, continuing: $(basename "$target_app")"
  fi
}

echo "==> [Phase 1] Signing standalone .app bundles..."
find "${SEARCH_DIRS[@]}" -name "*.app" -type d 2>/dev/null | sort -u | while read -r app; do
  sign_app_bundle "$app"
done

echo "==> [Phase 2] Repackaging DMG volumes (strip quarantine, re-sign)..."
find "${SEARCH_DIRS[@]}" -name "*.dmg" -type f 2>/dev/null | sort -u | while read -r dmg; do
  [ -f "$dmg" ] || continue
  echo "Processing DMG: $dmg"

  TMP_RW="/tmp/dmg_rw_$(date +%s)_$$.dmg"
  TMP_FINAL="/tmp/dmg_final_$(date +%s)_$$.dmg"
  MOUNT_DIR="/tmp/dmg_mount_$(date +%s)_$$"

  rm -f "$TMP_RW" "$TMP_FINAL"
  rm -rf "$MOUNT_DIR"
  mkdir -p "$MOUNT_DIR"

  hdiutil convert "$dmg" -format UDRW -o "$TMP_RW" -quiet

  hdiutil attach "$TMP_RW" -mountpoint "$MOUNT_DIR" -nobrowse -noautoopen -quiet

  xattr -cr "$MOUNT_DIR" 2>/dev/null || true
  xattr -d com.apple.quarantine "$MOUNT_DIR" 2>/dev/null || true

  rm -f "$MOUNT_DIR/.VolumeIcon.icns" 2>/dev/null || true
  rm -f "$MOUNT_DIR/._"* 2>/dev/null || true
  rm -rf "$MOUNT_DIR/.Trashes" 2>/dev/null || true
  rm -rf "$MOUNT_DIR/.fseventsd" 2>/dev/null || true
  rm -rf "$MOUNT_DIR/.Spotlight-V100" 2>/dev/null || true

  if command -v SetFile >/dev/null 2>&1; then
    SetFile -a C "$MOUNT_DIR" 2>/dev/null || true
  fi

  if [ ! -L "$MOUNT_DIR/Applications" ] && [ ! -d "$MOUNT_DIR/Applications" ]; then
    echo "  Creating /Applications symlink inside DMG for drag-and-drop..."
    ln -sf /Applications "$MOUNT_DIR/Applications" 2>/dev/null || true
  fi

  bless --folder "$MOUNT_DIR" --openfolder "$MOUNT_DIR" 2>/dev/null || true

  find "$MOUNT_DIR" -maxdepth 3 -name "*.app" -type d 2>/dev/null | while read -r app_in_dmg; do
    sign_app_bundle "$app_in_dmg"
  done

  cat << 'EOF' > "$MOUNT_DIR/HOW_TO_OPEN.txt"
==============================================================
  Foreigners Studio — macOS Installation Guide
==============================================================

1. Drag the "Foreigners Studio" icon into "Applications".

2. Open your Applications folder and launch "Foreigners Studio".

3. If macOS displays:
   "Apple could not verify Foreigners Studio is free of malware"

   This is Apple's standard prompt for apps downloaded from the web.
   NO TERMINAL IS NEEDED. Follow these simple steps:

   a. Click "Done" (or "Cancel") on the prompt dialog.
   b. Open your Mac's "System Settings" (Apple  menu at top-left).
   c. Select "Privacy & Security" in the sidebar.
   d. Scroll down to the "Security" section. You will see:
      "Foreigners Studio was blocked to protect your Mac"
   e. Click the "Open Anyway" button.
   f. Enter your Mac password / Touch ID and click "Open".

   You only need to do this ONCE. After the first time,
   Foreigners Studio will launch directly every time!
==============================================================
EOF

  for retry in 1 2 3 4 5; do
    if hdiutil detach "$MOUNT_DIR" -force -quiet 2>/dev/null; then break; fi
    sleep 2
  done
  rm -rf "$MOUNT_DIR"

  hdiutil convert "$TMP_RW" -format UDZO -imagekey zlib-level=9 -o "$TMP_FINAL" -quiet
  mv -f "$TMP_FINAL" "$dmg"
  rm -f "$TMP_RW"

  xattr -cr "$dmg" 2>/dev/null || true
  xattr -d com.apple.quarantine "$dmg" 2>/dev/null || true

  if [ "$SIGN_ID" != "-" ]; then
    codesign --force $TIMESTAMP_FLAG --options runtime --sign "$SIGN_ID" "$dmg" 2>/dev/null || \
      codesign --force $TIMESTAMP_FLAG --sign "$SIGN_ID" "$dmg" 2>/dev/null || true
  else
    codesign --force --sign "$SIGN_ID" "$dmg" 2>/dev/null || true
  fi
  codesign --verify --deep --strict "$dmg" 2>/dev/null || true

  echo "  ✓ Sanitized DMG: $dmg"
done

echo "==> [Phase 3] Creating clean .app.tar.gz archives..."
for bDir in \
  "src-tauri/target/universal-apple-darwin/release/bundle/macos" \
  "src-tauri/target/release/bundle/macos" \
  "src-tauri/target/aarch64-apple-darwin/release/bundle/macos" \
  "src-tauri/target/x86_64-apple-darwin/release/bundle/macos"; do

  [ -d "$bDir" ] || continue
  find "$bDir" -maxdepth 1 -name "*.app" -type d 2>/dev/null | while read -r app; do
    APP_NAME=$(basename "$app" .app)
    TARBALL="dist-release/${APP_NAME// /_}_universal.app.tar.gz"
    [ -d "dist-release" ] || mkdir -p "dist-release"

    echo "  Creating: $TARBALL"
    xattr -cr "$app" 2>/dev/null || true
    xattr -d com.apple.quarantine "$app" 2>/dev/null || true

    sign_app_bundle "$app"

    COPYFILE_DISABLE=1 tar -czf "$TARBALL" -C "$(dirname "$app")" "$(basename "$app")"
    TARBALL_VER="dist-release/${APP_NAME// /_}_1.0.0_universal.app.tar.gz"
    cp -f "$TARBALL" "$TARBALL_VER" 2>/dev/null || true
    echo "  ✓ Created: $TARBALL and $TARBALL_VER"
  done
done

echo "==> [Phase 4] Final signing pass on dist-release .app bundles..."
find "dist-release" -name "*.app" -type d 2>/dev/null | sort -u | while read -r app; do
  sign_app_bundle "$app"
done

echo "==> DMG sanitization and signing complete."
