#!/usr/bin/env bash
set -e

echo "==> Post-processing DMG bundles to remove VolumeIcon.icns..."

SEARCH_DIRS=()
[ -d "src-tauri/target" ] && SEARCH_DIRS+=("src-tauri/target")
[ -d "dist-release" ] && SEARCH_DIRS+=("dist-release")

if [ ${#SEARCH_DIRS[@]} -eq 0 ]; then
  echo "No target or release directories found to sanitize."
  exit 0
fi

# Find all DMG files
find "${SEARCH_DIRS[@]}" -name "*.dmg" -type f 2>/dev/null | sort -u | while read -r dmg; do
  [ -f "$dmg" ] || continue
  echo "Processing: $dmg"
  
  TMP_RW="/tmp/dmg_rw_$(date +%s)_$$.dmg"
  TMP_FINAL="/tmp/dmg_final_$(date +%s)_$$.dmg"
  MOUNT_DIR="/tmp/dmg_mount_$(date +%s)_$$"
  
  rm -f "$TMP_RW" "$TMP_FINAL"
  rm -rf "$MOUNT_DIR"
  mkdir -p "$MOUNT_DIR"

  # Convert to read-write DMG
  hdiutil convert "$dmg" -format UDRW -o "$TMP_RW"
  
  # Mount without opening Finder window
  hdiutil attach "$TMP_RW" -mountpoint "$MOUNT_DIR" -nobrowse -noautoopen
  
  # Remove volume icon and any stray dot files so only the app and Applications show
  rm -f "$MOUNT_DIR/.VolumeIcon.icns" 2>/dev/null || true
  rm -f "$MOUNT_DIR/._*" 2>/dev/null || true
  rm -rf "$MOUNT_DIR/.Trashes" 2>/dev/null || true
  rm -rf "$MOUNT_DIR/.fseventsd" 2>/dev/null || true

  # If SetFile exists, remove custom volume icon bit from the root mountpoint
  if command -v SetFile >/dev/null 2>&1; then
    SetFile -a c "$MOUNT_DIR" 2>/dev/null || true
  fi

  # Detach with retries
  for retry in 1 2 3; do
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
  
  echo "✓ Successfully sanitized DMG: $dmg (VolumeIcon.icns removed)"
done

echo "==> DMG post-processing complete."
