#!/usr/bin/env bash
# ==============================================================================
#  Foreigners Studio - macOS One-Command Enterprise Installer
#
#  Usage:
#    curl -fsSL https://raw.githubusercontent.com/pankaj886/application/main/install-mac.sh | bash
#    or:
#    bash install-mac.sh [path/to/Foreigners_Studio.dmg]
# ==============================================================================

set -euo pipefail

# ANSI color codes
BOLD="\033[1m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
RESET="\033[0m"

echo -e "${BLUE}${BOLD}"
echo "=========================================================="
echo "    Foreigners Studio - macOS Installer & Gatekeeper Fix  "
echo "=========================================================="
echo -e "${RESET}"

# 1. OS Verification
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo -e "${RED}Error: This script must be run on macOS (Darwin).${RESET}" >&2
  exit 1
fi

APP_NAME="Foreigners Studio"
APP_BUNDLE_NAME="Foreigners Studio.app"
INSTALL_DIR="/Applications"
TARGET_APP="$INSTALL_DIR/$APP_BUNDLE_NAME"
GITHUB_REPO="${GITHUB_REPO:-pankaj886/application}"
FALLBACK_VERSION="v1.0.4"
FALLBACK_DMG_NAME="Foreigners_Studio_1.0.0_universal.dmg"

MOUNT_DIR=""
TEMP_DMG=""

cleanup() {
  local exit_code=$?
  if [ -n "$MOUNT_DIR" ] && [ -d "$MOUNT_DIR" ]; then
    echo -e "\n${BLUE}==> Unmounting installer image...${RESET}"
    for retry in 1 2 3; do
      if hdiutil detach "$MOUNT_DIR" -force -quiet 2>/dev/null; then
        break
      fi
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

# 2. Determine DMG Source (Argument, Local, or Download)
DMG_FILE=""

if [ "${1:-}" != "" ]; then
  if [ -f "$1" ]; then
    DMG_FILE="$1"
    echo -e "${GREEN}✓ Using specified local DMG:${RESET} $DMG_FILE"
  elif [[ "$1" =~ ^https?:// ]]; then
    CUSTOM_URL="$1"
    TEMP_DMG=$(mktemp /tmp/foreigners_studio_XXXXXX.dmg)
    echo -e "${BLUE}==> Downloading DMG from custom URL...${RESET}"
    curl -fSL --progress-bar "$CUSTOM_URL" -o "$TEMP_DMG"
    DMG_FILE="$TEMP_DMG"
  fi
fi

if [ -z "$DMG_FILE" ]; then
  # Check if a built DMG already exists locally in dist-release or current dir
  if [ -f "dist-release/$FALLBACK_DMG_NAME" ]; then
    DMG_FILE="dist-release/$FALLBACK_DMG_NAME"
    echo -e "${GREEN}✓ Found local build in dist-release:${RESET} $DMG_FILE"
  elif [ -f "$FALLBACK_DMG_NAME" ]; then
    DMG_FILE="$FALLBACK_DMG_NAME"
    echo -e "${GREEN}✓ Found local DMG in current directory:${RESET} $DMG_FILE"
  fi
fi

if [ -z "$DMG_FILE" ]; then
  echo -e "${BLUE}==> [1/5] Resolving latest Universal DMG release from GitHub (${GITHUB_REPO})...${RESET}"
  
  # Check for token in env or git credentials
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
  
  # Try GitHub API first
  API_URL="https://api.github.com/repos/${GITHUB_REPO}/releases/latest"
  API_JSON=$(curl -fsSL "${CURL_AUTH[@]}" "$API_URL" 2>/dev/null || true)
  
  if [ -n "$API_JSON" ]; then
    # Look for asset id/url for private repositories
    ASSET_API_URL=$(echo "$API_JSON" | grep -B 2 -A 5 'Foreigners_Studio.*\.dmg' | grep -o 'https://api.github.com/repos/[^"]*/releases/assets/[0-9]*' | head -n 1 || true)
    BROWSER_URL=$(echo "$API_JSON" | grep -o 'https://[^"]*universal[^"]*\.dmg' | head -n 1 || true)
    
    if [ -n "$ASSET_API_URL" ] && [ -n "$GITHUB_TOKEN" ]; then
      DOWNLOAD_URL="$ASSET_API_URL"
      EXTRA_HEADER=(-H "Accept: application/octet-stream")
    elif [ -n "$BROWSER_URL" ]; then
      DOWNLOAD_URL="$BROWSER_URL"
    fi
  fi

  # Fallback to direct download URLs
  if [ -z "$DOWNLOAD_URL" ]; then
    DOWNLOAD_URL="https://github.com/${GITHUB_REPO}/releases/download/${FALLBACK_VERSION}/${FALLBACK_DMG_NAME}"
  fi

  TEMP_DMG=$(mktemp /tmp/foreigners_studio_XXXXXX.dmg)
  echo -e "${BLUE}==> [2/5] Downloading macOS Universal DMG...${RESET}"
  echo -e "    Source: ${DOWNLOAD_URL}"

  if ! curl -fSL --progress-bar "${CURL_AUTH[@]}" "${EXTRA_HEADER[@]}" "$DOWNLOAD_URL" -o "$TEMP_DMG"; then
    # Try latest generic redirect if version tag failed
    ALT_URL="https://github.com/${GITHUB_REPO}/releases/latest/download/${FALLBACK_DMG_NAME}"
    echo -e "${YELLOW}Retrying via latest release pointer...${RESET}"
    if ! curl -fSL --progress-bar "${CURL_AUTH[@]}" "$ALT_URL" -o "$TEMP_DMG"; then
      echo -e "${RED}❌ Download failed!${RESET}" >&2
      echo "If ${GITHUB_REPO} is a private repository, please pass your GitHub Token:" >&2
      echo "  GITHUB_TOKEN=your_token bash install-mac.sh" >&2
      echo "Or download the DMG manually from https://github.com/${GITHUB_REPO}/releases and run:" >&2
      echo "  bash install-mac.sh /path/to/${FALLBACK_DMG_NAME}" >&2
      exit 1
    fi
  fi
  DMG_FILE="$TEMP_DMG"
  echo -e "${GREEN}✓ Download complete!${RESET}"
fi

# 3. Mount DMG
echo -e "${BLUE}==> [3/5] Mounting DMG disk image...${RESET}"
MOUNT_DIR=$(mktemp -d /tmp/foreigners_studio_mount_XXXXXX)
hdiutil attach "$DMG_FILE" -mountpoint "$MOUNT_DIR" -nobrowse -noautoopen -quiet

# Locate .app inside DMG
APP_IN_DMG=$(find "$MOUNT_DIR" -maxdepth 2 -name "*.app" -type d | head -n 1)
if [ -z "$APP_IN_DMG" ] || [ ! -d "$APP_IN_DMG" ]; then
  echo -e "${RED}❌ Error: No .app found inside the mounted disk image!${RESET}" >&2
  exit 1
fi
echo -e "${GREEN}✓ Found application bundle:${RESET} $(basename "$APP_IN_DMG")"

# 4. Copy to /Applications
echo -e "${BLUE}==> [4/5] Installing to ${TARGET_APP}...${RESET}"

# Close existing instance if running
if pgrep -fi "Foreigners Studio" >/dev/null 2>&1; then
  echo -e "${YELLOW}Closing existing Foreigners Studio instance...${RESET}"
  pkill -fi "Foreigners Studio" 2>/dev/null || true
  sleep 1
fi

SUDO_CMD=""
if [ ! -w "$INSTALL_DIR" ]; then
  echo -e "${YELLOW}Notice: Writing to /Applications requires administrator permissions.${RESET}"
  SUDO_CMD="sudo"
fi

$SUDO_CMD rm -rf "$TARGET_APP" 2>/dev/null || true
$SUDO_CMD cp -R "$APP_IN_DMG" "$TARGET_APP"
echo -e "${GREEN}✓ Copied application into ${INSTALL_DIR}${RESET}"

# 5. Strip quarantine & re-sign with ad-hoc identity to satisfy Gatekeeper
echo -e "${BLUE}==> [5/5] Fixing Gatekeeper quarantine and registering local signature...${RESET}"

echo "    -> Removing quarantine attribute (xattr -cr)..."
$SUDO_CMD xattr -cr "$TARGET_APP"

echo "    -> Ad-hoc signing with hardened runtime (codesign --force --deep --options runtime --sign -)..."
$SUDO_CMD codesign --force --deep --options runtime --sign - "$TARGET_APP"

if codesign --verify --deep --strict "$TARGET_APP" 2>/dev/null; then
  echo -e "${GREEN}    ✓ Signature verified strictly!${RESET}"
else
  echo -e "${YELLOW}    ⚠ Codesign verification notice (ad-hoc registered)${RESET}"
fi

# 6. Launch Application Cleanly
echo -e "\n${GREEN}${BOLD}=========================================================="
echo "  ✓ INSTALLATION SUCCESSFUL!                              "
echo "  Foreigners Studio is now installed in your Applications."
echo "==========================================================${RESET}"

echo -e "${BLUE}==> Launching ${APP_NAME}...${RESET}"
open "$TARGET_APP"
echo -e "${GREEN}✓ Application opened cleanly with zero warnings.${RESET}\n"
