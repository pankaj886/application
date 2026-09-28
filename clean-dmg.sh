#!/usr/bin/env bash
set -eo pipefail

if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "==> clean-dmg.sh: Non-macOS environment detected ($OSTYPE). Skipping macOS DMG cleaning."
  exit 0
fi

echo "=========================================================="
echo "  Foreigners Studio - macOS DMG & Bundle Sanitizer        "
echo "=========================================================="

SEARCH_DIRS=()
[ -d "src-tauri/target" ] && SEARCH_DIRS+=("src-tauri/target")
[ -d "dist-release" ] && SEARCH_DIRS+=("dist-release")

if [ ${#SEARCH_DIRS[@]} -eq 0 ]; then
  echo "No target or release directories found to sanitize."
  exit 0
fi

sign_app_bundle() {
  local target_app="$1"
  [ -d "$target_app" ] || return 0
  echo "==> Sanitizing and signing .app bundle: $target_app"
  
  # Strip all extended attributes (quarantine, provenance, metadata)
  xattr -cr "$target_app" 2>/dev/null || true
  
  # Ad-hoc sign with hardened runtime enabled
  codesign --force --deep --options runtime --sign - "$target_app"
  
  # Verify signature strictly
  if codesign --verify --deep --strict "$target_app" 2>/dev/null; then
    echo "✓ Code signature verified: $target_app"
  else
    echo "⚠ Note: codesign strict check output for: $target_app"
    codesign --verify --deep --strict --verbose=2 "$target_app" || true
  fi
}

# 1. Process all standalone .app bundles before DMG creation / modification
echo "==> [Phase 1] Scanning for standalone .app bundles before DMG processing..."
find "${SEARCH_DIRS[@]}" -name "*.app" -type d 2>/dev/null | sort -u | while read -r app; do
  sign_app_bundle "$app"
done

# 2. Process all DMG images (sanitize contents and re-sign app inside volume)
echo "==> [Phase 2] Sanitizing DMG volumes and signing internal bundles..."
find "${SEARCH_DIRS[@]}" -name "*.dmg" -type f 2>/dev/null | sort -u | while read -r dmg; do
  [ -f "$dmg" ] || continue
  echo "Processing DMG: $dmg"
  
  TMP_RW="/tmp/dmg_rw_$(date +%s)_$$.dmg"
  TMP_FINAL="/tmp/dmg_final_$(date +%s)_$$.dmg"
  MOUNT_DIR="/tmp/dmg_mount_$(date +%s)_$$"
  
  rm -f "$TMP_RW" "$TMP_FINAL"
  rm -rf "$MOUNT_DIR"
  mkdir -p "$MOUNT_DIR"

  # Convert to read-write DMG
  hdiutil convert "$dmg" -format UDRW -o "$TMP_RW"
  
  # Mount without opening Finder window
  hdiutil attach "$TMP_RW" -mountpoint "$MOUNT_DIR" -nobrowse -noautoopen -quiet
  
  # Remove volume icon and any stray dot files so only the app and Applications show
  rm -f "$MOUNT_DIR/.VolumeIcon.icns" 2>/dev/null || true
  rm -f "$MOUNT_DIR/._*" 2>/dev/null || true
  rm -rf "$MOUNT_DIR/.Trashes" 2>/dev/null || true
  rm -rf "$MOUNT_DIR/.fseventsd" 2>/dev/null || true

  # If SetFile exists, remove custom volume icon bit from the root mountpoint
  if command -v SetFile >/dev/null 2>&1; then
    SetFile -a c "$MOUNT_DIR" 2>/dev/null || true
  fi

  # Sanitize and sign any .app bundles located inside the DMG volume
  find "$MOUNT_DIR" -maxdepth 2 -name "*.app" -type d 2>/dev/null | while read -r app_in_dmg; do
    sign_app_bundle "$app_in_dmg"
  done

  # Detach with retries
  for retry in 1 2 3 4 5; do
    if hdiutil detach "$MOUNT_DIR" -force 2>/dev/null; then
      break
    fi
    sleep 1
  done
  rm -rf "$MOUNT_DIR"

  # Convert back to compressed read-only UDZO DMG
  hdiutil convert "$TMP_RW" -format UDZO -imagekey zlib-level=9 -o "$TMP_FINAL"
  mv -f "$TMP_FINAL" "$dmg"
  rm -f "$TMP_RW"

  # Ad-hoc sign the DMG container
  codesign --force --sign - "$dmg" 2>/dev/null || true
  
  echo "✓ Successfully sanitized and signed DMG: $dmg"
done

# 3. Post-verification / final pass on .app bundles
echo "==> [Phase 3] Final verification of all .app bundles..."
find "${SEARCH_DIRS[@]}" -name "*.app" -type d 2>/dev/null | sort -u | while read -r app; do
  sign_app_bundle "$app"
done

echo "==> DMG and .app bundle post-processing complete."
