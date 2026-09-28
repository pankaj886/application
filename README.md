# Foreigners Studio — Enterprise Desktop Suite

[![Security: Enclave](https://img.shields.io/badge/Security-Ed25519%20Signed-emerald?style=flat-square)](#security)
[![License: Private](https://img.shields.io/badge/Access-Private%20Repository-red?style=flat-square)](#private-repository-access)
[![Platform: Windows | macOS](https://img.shields.io/badge/Platforms-Windows%20%7C%20macOS-blue?style=flat-square)](#downloads)

Foreigners Studio is a sovereign consular facilitation desktop suite designed for regulatory compliance, automated passport intake processing, and rapid slot scheduling. Built with **Tauri v2 + Rust + React 19 + TypeScript**.

---

## 📥 Private Repository Downloads

> [!IMPORTANT]
> **Private Repository Access**: Since this repository is private, you must be logged into your authorized GitHub account (`pankaj886` or collaborator) to download these files and release assets.

### Download Links Table

| Operating System | Package Type | Direct Download Link | Format |
| :--- | :--- | :--- | :--- |
| **Windows 10 / 11** (64-bit) | **Standalone Executable** | [⬇️ **Download foreigners_studio.exe**](https://github.com/pankaj886/application/raw/main/dist-release/foreigners_studio.exe) | `.exe` (Portable) |
| **Windows 10 / 11** (64-bit) | **NSIS Full Installer** | [⬇️ **Download Windows Installer (.exe)**](https://github.com/pankaj886/application/releases/latest/download/Foreigners_Studio_1.0.0_x64-setup.exe) | `.exe` (Setup Wizard) |
| **Windows 10 / 11** (64-bit) | **Enterprise MSI** | [⬇️ **Download Windows MSI**](https://github.com/pankaj886/application/releases/latest/download/Foreigners_Studio_1.0.0_x64_en-US.msi) | `.msi` |
| **macOS** (Apple Silicon & Intel) | **Universal Disk Image** | [⬇️ **Download macOS DMG (.dmg)**](https://github.com/pankaj886/application/releases/latest/download/Foreigners_Studio_1.0.0_universal.dmg) | `.dmg` (Universal) |
| **macOS** (Apple Silicon & Intel) | **Compressed App Bundle** | [⬇️ **Download macOS App Archive**](https://github.com/pankaj886/application/releases/latest/download/Foreigners_Studio_1.0.0_universal.app.tar.gz) | `.app.tar.gz` |

*To download other release assets or previous versions, visit the [📦 GitHub Releases Page](https://github.com/pankaj886/application/releases).*

---

## 🚀 Installation Guide

### Windows
1. Download [**foreigners_studio.exe**](https://github.com/pankaj886/application/raw/main/dist-release/foreigners_studio.exe) or the NSIS setup installer.
2. If Windows Defender SmartScreen shows *"Windows protected your PC"*, click **More info** → **Run anyway**.
3. Foreigners Studio launches immediately.

### macOS
1. Download the [**macOS Universal DMG**](https://github.com/pankaj886/application/releases/latest/download/Foreigners_Studio_1.0.0_universal.dmg).
2. Open the `.dmg` disk image and drag **Foreigners Studio** into your **Applications** folder.
3. Launch from Spotlight (`Cmd + Space`) or Launchpad.

---

## 🔄 Automatic Background Updates ("Restart to Update")

Foreigners Studio includes a silent, tamper-proof background auto-update engine:

1. **Background Polling & Verification**:
   - The desktop client checks `latest.json` on the release server on launch and at regular intervals.
   - When a new version is detected, the app automatically downloads the update package over HTTPS.
   - **Ed25519 Cryptographic Verification**: Every package is mathematically checked against the public key compiled into the binary. Corrupted or unverified packages are rejected immediately.
2. **TitleBar UI Notification**:
   - In the **top UI corner right before the Minimize button** on Windows (and top-right corner on macOS), a glowing **"Restart to update"** button appears.
3. **One-Click Silent Reinstallation**:
   - Clicking **"Restart to update"** silently replaces the application and restarts into the updated version automatically with zero user friction.

---

## 🛠️ Unified Architecture (Zero Duplication)

The codebase is unified into a single cross-platform source of truth:
```
├── src/                  # Unified React 19 + TypeScript Frontend
│   ├── components/       # TitleBar (with Restart-to-Update), Sidebar, Views
│   ├── services/         # updateService.ts (Background auto-updater & silent installer)
│   └── App.css           # Sovereign Obsidian Design System
├── src-tauri/            # Hardened Rust Backend (Windows MSVC + macOS Universal)
│   ├── capabilities/     # Secure enclave permissions (updater:default, process:default)
│   ├── Entitlements.plist# macOS App Sandbox & hardened runtime entitlements
│   ├── Info.plist        # macOS application bundle metadata
│   ├── build.rs          # Universal build script (WebView2 loader & platform configs)
│   └── tauri.conf.json   # Unified multi-platform bundle & updater configuration
├── dist-release/         # Built standalone production executables & installers
├── build-windows.bat     # 1-Click native Windows bundle builder (.exe & .msi)
├── build-macos.sh        # 1-Click native macOS bundle builder (.dmg & .app)
└── .github/workflows/    # Automated CI/CD release & cross-platform build pipelines
```

---

## 🏗️ How to Build & Package Locally

### Windows Build (.exe / .msi)
```powershell
npm run tauri:build:windows
# or run:
.\build-windows.bat
```
Artifacts are automatically placed in `dist-release/`:
- `Foreigners_Studio_x64-setup.exe` (NSIS Installer)
- `Foreigners_Studio_x64_en-US.msi` (MSI Installer)
- `foreigners_studio.exe` (Standalone portable executable)

### macOS Build (.dmg / .app)
```bash
npm run tauri:build:macos
# or run:
bash build-macos.sh
```
Artifacts are automatically placed in `dist-release/`:
- `Foreigners_Studio_universal.dmg` (Universal Apple Silicon M1/M2/M3/M4 & Intel DMG)
- `Foreigners_Studio.app` (macOS Application bundle)

---

## 🔐 Security Enclave

- **Memory Safety**: Hardened Rust core compiled with `lto = "fat"`, `opt-level = 3`, `panic = "abort"`, and `strip = "symbols"`.
- **Anti-Reverse Engineering**: DevTools hotkeys (`F12`, `Ctrl+Shift+I`, `Ctrl+U`) disabled, right-click inspect disabled in production builds.
- **Tamper Immunity**: Unsigned update archives are rejected by the client cryptographic verifier.
