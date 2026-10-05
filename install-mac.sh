#!/usr/bin/env bash

set -euo pipefail

BOLD="\033[1m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
RESET="\033[0m"

echo -e "${BLUE}${BOLD}"
echo "=========================================================="
echo "    Foreigners Studio - macOS Installer                   "
echo "=========================================================="
echo -e "${RESET}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo -e "${RED}Error: This script must be run on macOS (Darwin).${RESET}" >&2
  exit 1
fi

APP_NAME="Foreigners Studio"
APP_BUNDLE_NAME="Foreigners Studio.app"
INSTALL_DIR="/Applications"
TARGET_APP="$INSTALL_DIR/$APP_BUNDLE_NAME"
GITHUB_REPO="${GITHUB_REPO:-pankaj886/application}"
FALLBACK_VERSION="v1.0.6"
FALLBACK_DMG_NAME="Foreigners_Studio_1.0.0_universal.dmg"

MOUNT_DIR=""
TEMP_DMG=""

cleanup() {
  local exit_code=$?
  if [ -n "$MOUNT_DIR" ] && [ -d "$MOUNT_DIR" ]; then
    echo -e "\n${BLUE}==> Unmounting installer image...${RESET}"
    for retry in 1 2 3; do
      if hdiutil detach "$MOUNT_DIR" -force -quiet 2>/dev/null; then break; fi
      sleep 1
    done
    rm -rf "$MOUNT_DIR" 2>/dev/null || true
  fi
  if [ -n "$TEMP_DMG" ] && [ -f "$TEMP_DMG" ]; then
    rm -f "$TEMP_DMG" 2>/dev/null || true
  fi
  exit "$exit_code"
}
trap cleanup EXIT INT TERM

DMG_FILE=""

if [ "${1:-}" != "" ]; then
  if [ -f "$1" ]; then
    DMG_FILE="$1"
    echo -e "${GREEN}✓ Using specified local DMG:${RESET} $DMG_FILE"
  elif [[ "$1" =~ ^https?:// ]]; then
    TEMP_DMG=$(mktemp /tmp/foreigners_studio_XXXXXX.dmg)
    echo -e "${BLUE}==> Downloading DMG from custom URL...${RESET}"
    curl -fSL --progress-bar "$1" -o "$TEMP_DMG"
    DMG_FILE="$TEMP_DMG"
  fi
fi

if [ -z "$DMG_FILE" ]; then
  if [ -f "dist-release/$FALLBACK_DMG_NAME" ]; then
    DMG_FILE="dist-release/$FALLBACK_DMG_NAME"
    echo -e "${GREEN}✓ Found local build:${RESET} $DMG_FILE"
  elif [ -f "$FALLBACK_DMG_NAME" ]; then
    DMG_FILE="$FALLBACK_DMG_NAME"
    echo -e "${GREEN}✓ Found local DMG:${RESET} $DMG_FILE"
  fi
fi

if [ -z "$DMG_FILE" ]; then
  echo -e "${BLUE}==> [1/5] Resolving latest Universal DMG from GitHub (${GITHUB_REPO})...${RESET}"

  GITHUB_TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"
  if [ -z "$GITHUB_TOKEN" ]; then
    GIT_PASS=$(printf "protocol=https\nhost=github.com\n" | git credential fill 2>/dev/null | grep "^password=" | cut -d= -f2- || true)
    if [ -n "$GIT_PASS" ]; then
      GITHUB_TOKEN="$GIT_PASS"
    fi
  fi

  CURL_AUTH=()
  if [ -n "$GITHUB_TOKEN" ]; then
    CURL_AUTH=(-H "Authorization: Bearer $GITHUB_TOKEN")
  fi

  DOWNLOAD_URL=""
  EXTRA_HEADER=()

  API_URL="https://api.github.com/repos/${GITHUB_REPO}/releases/latest"
  API_JSON=$(curl -fsSL "${CURL_AUTH[@]}" "$API_URL" 2>/dev/null || true)

  if [ -n "$API_JSON" ]; then
    ASSET_API_URL=$(echo "$API_JSON" | grep -B 2 -A 5 'Foreigners_Studio.*\.dmg' | grep -o 'https://api.github.com/repos/[^"]*/releases/assets/[0-9]*' | head -n 1 || true)
    BROWSER_URL=$(echo "$API_JSON" | grep -o 'https://[^"]*universal[^"]*\.dmg' | head -n 1 || true)

    if [ -n "$ASSET_API_URL" ] && [ -n "$GITHUB_TOKEN" ]; then
      DOWNLOAD_URL="$ASSET_API_URL"
      EXTRA_HEADER=(-H "Accept: application/octet-stream")
    elif [ -n "$BROWSER_URL" ]; then
      DOWNLOAD_URL="$BROWSER_URL"
    fi
  fi

  if [ -z "$DOWNLOAD_URL" ]; then
    DOWNLOAD_URL="https://github.com/${GITHUB_REPO}/releases/download/${FALLBACK_VERSION}/${FALLBACK_DMG_NAME}"
  fi

  TEMP_DMG=$(mktemp /tmp/foreigners_studio_XXXXXX.dmg)
  echo -e "${BLUE}==> [2/5] Downloading macOS Universal DMG...${RESET}"
  echo -e "    Source: ${DOWNLOAD_URL}"

  if ! curl -fSL --progress-bar "${CURL_AUTH[@]}" "${EXTRA_HEADER[@]}" "$DOWNLOAD_URL" -o "$TEMP_DMG"; then
    ALT_URL="https://github.com/${GITHUB_REPO}/releases/latest/download/${FALLBACK_DMG_NAME}"
    echo -e "${YELLOW}Retrying via latest release pointer...${RESET}"
    if ! curl -fSL --progress-bar "${CURL_AUTH[@]}" "$ALT_URL" -o "$TEMP_DMG"; then
      echo -e "${RED}❌ Download failed!${RESET}" >&2
      echo "If ${GITHUB_REPO} is a private repository, pass your GitHub Token:" >&2
      echo "  GITHUB_TOKEN=your_token bash install-mac.sh" >&2
      echo "Or download from https://github.com/${GITHUB_REPO}/releases and run:" >&2
      echo "  bash install-mac.sh /path/to/${FALLBACK_DMG_NAME}" >&2
      exit 1
    fi
  fi
  DMG_FILE="$TEMP_DMG"
  echo -e "${GREEN}✓ Download complete!${RESET}"
fi

echo -e "${BLUE}==> [3/5] Stripping Gatekeeper quarantine from DMG...${RESET}"
xattr -cr "$DMG_FILE" 2>/dev/null || true
xattr -d com.apple.quarantine "$DMG_FILE" 2>/dev/null || true
echo -e "${GREEN}✓ Quarantine attributes cleared from DMG${RESET}"

echo -e "${BLUE}==> [4/5] Mounting disk image...${RESET}"
MOUNT_DIR=$(mktemp -d /tmp/foreigners_studio_mount_XXXXXX)
hdiutil attach "$DMG_FILE" -mountpoint "$MOUNT_DIR" -nobrowse -noautoopen -quiet

APP_IN_DMG=$(find "$MOUNT_DIR" -maxdepth 2 -name "*.app" -type d | head -n 1)
if [ -z "$APP_IN_DMG" ] || [ ! -d "$APP_IN_DMG" ]; then
  echo -e "${RED}❌ Error: No .app found inside the mounted disk image!${RESET}" >&2
  exit 1
fi
echo -e "${GREEN}✓ Found:${RESET} $(basename "$APP_IN_DMG")"

echo -e "${BLUE}==> [5/5] Installing to ${TARGET_APP}...${RESET}"

if pgrep -fi "Foreigners Studio" >/dev/null 2>&1; then
  echo -e "${YELLOW}Closing existing Foreigners Studio instance...${RESET}"
  pkill -fi "Foreigners Studio" 2>/dev/null || true
  sleep 1
fi

if [ -d "$TARGET_APP" ]; then
  echo -e "${YELLOW}Removing previous installation...${RESET}"
  rm -rf "$TARGET_APP"
fi

cp -R "$APP_IN_DMG" "$TARGET_APP"
echo -e "${GREEN}✓ Copied to ${TARGET_APP}${RESET}"

hdiutil detach "$MOUNT_DIR" -force -quiet 2>/dev/null || true
rm -rf "$MOUNT_DIR" 2>/dev/null || true
MOUNT_DIR=""

echo -e "${BLUE}==> Post-install: Clearing Gatekeeper quarantine from installed app...${RESET}"

xattr -cr "$TARGET_APP" 2>/dev/null || true

xattr -d com.apple.quarantine "$TARGET_APP" 2>/dev/null || true

find "$TARGET_APP" -exec xattr -c {} \; 2>/dev/null || true

echo -e "${GREEN}✓ Quarantine attributes cleared from installed app${RESET}"

echo -e "${BLUE}==> Re-signing app with local ad-hoc signature...${RESET}"

find "$TARGET_APP" -type f \( -name "*.dylib" -o -name "*.so" \) 2>/dev/null | while read -r lib; do
  codesign --force --options runtime --sign - "$lib" 2>/dev/null || true
done

if codesign --force --deep --options runtime --sign - "$TARGET_APP" 2>/dev/null; then
  echo -e "${GREEN}✓ App re-signed with ad-hoc signature (hardened runtime)${RESET}"
else
  codesign --force --deep --sign - "$TARGET_APP" 2>/dev/null || true
  echo -e "${YELLOW}⚠ App signed without hardened runtime (fallback)${RESET}"
fi

echo -e "${BLUE}==> Verifying signature...${RESET}"
if codesign --verify --deep --strict "$TARGET_APP" 2>/dev/null; then
  echo -e "${GREEN}✓ Code signature is valid${RESET}"
else
  echo -e "${YELLOW}⚠ Signature verification note (may be normal for ad-hoc)${RESET}"
fi

echo ""
echo -e "${GREEN}${BOLD}✓ Foreigners Studio installed successfully!${RESET}"
echo ""
echo -e "  Location: ${TARGET_APP}"
echo ""
echo -e "${BLUE}==> Launching Foreigners Studio...${RESET}"
open "$TARGET_APP" 2>/dev/null || true

echo ""
echo -e "${GREEN}${BOLD}Installation complete! Foreigners Studio is now running.${RESET}"
echo ""
echo -e "${YELLOW}If macOS shows a security dialog on first launch:${RESET}"
echo -e "  1. Click ${BOLD}'Open'${RESET}${YELLOW} if prompted${RESET}"
echo -e "  2. Or go to: ${BOLD}System Settings → Privacy & Security → Open Anyway${RESET}"
echo ""
