# Foreigners Studio

Enterprise desktop application for consular appointment management, passport assistance, and workflow processing.

---

## 📥 Downloads (Release v1.0.6)

All release assets are available on the [**GitHub Releases Page (v1.0.6)**](https://github.com/pankaj886/application/releases/tag/v1.0.6).

| Platform | Package | Format | Direct Download |
| :--- | :--- | :--- | :--- |
| **macOS** (Apple Silicon & Intel) | **Universal Disk Image** | `.dmg` | [Download macOS DMG](https://github.com/pankaj886/application/releases/download/v1.0.6/Foreigners_Studio_1.0.0_universal.dmg) |
| **macOS** (Apple Silicon & Intel) | **Universal Archive** | `.app.tar.gz` | [Download macOS Tarball](https://github.com/pankaj886/application/releases/download/v1.0.6/Foreigners_Studio_universal.app.tar.gz) |
| **Windows** (10 / 11, 64-bit) | **Setup Installer (Current User, No UAC)** | `.exe` | [Download Windows Setup](https://github.com/pankaj886/application/releases/download/v1.0.6/Foreigners_Studio_1.0.0_x64-setup.exe) |
| **Windows** (10 / 11, 64-bit) | **Enterprise Package** | `.msi` | [Download Windows MSI](https://github.com/pankaj886/application/releases/download/v1.0.6/Foreigners_Studio_1.0.0_x64_en-US.msi) |
| **Windows** (10 / 11, 64-bit) | **Portable Bundle (ZIP)** | `.zip` | [Download Windows ZIP](https://github.com/pankaj886/application/releases/download/v1.0.6/Foreigners_Studio_Windows_x64.zip) |

> **Note:** This is a private repository. You must be logged into your authorized GitHub account to download release files.

---

## 🚀 Installation Guide

### 🍏 macOS (No Terminal Required)

#### Standard Installation (3 Clicks in macOS System Settings)

1. **Download and double-click** [`Foreigners_Studio_1.0.0_universal.dmg`](https://github.com/pankaj886/application/releases/download/v1.0.6/Foreigners_Studio_1.0.0_universal.dmg).
2. If macOS displays:  
   *`"Foreigners_Studio_1.0.0_universal.dmg" Not Opened — Apple could not verify it is free of malware`*  
   **Click "Done"** (or "Cancel") on the prompt.
3. Open your Mac's **System Settings** (Apple  menu at the top-left corner).
4. Click **Privacy & Security** in the left sidebar, and scroll down to the **Security** section.
5. You will see:  
   *`"Foreigners_Studio_1.0.0_universal.dmg" was blocked to protect your Mac.`*  
   Click the **[Open Anyway]** button next to it.
6. Enter your Mac login password or Touch ID, then click **Open**.
7. The disk image opens: **drag "Foreigners Studio" into "Applications"**.

> **Note:** You only have to perform this step once. After this initial approval, Foreigners Studio will launch directly with zero prompts forever.

---

#### Alternative: One-Line Terminal Command (For Developers)

If you prefer installing via Terminal, run:

```bash
curl -fsSL https://raw.githubusercontent.com/pankaj886/application/main/install-mac.sh | bash
```

This script downloads the app, clears the download quarantine, copies it to `/Applications`, and launches it immediately.

---

### 🪟 Windows

#### Option A — Standard Setup Installer (.exe / .msi)

1. **Download and run** [`Foreigners_Studio_1.0.0_x64-setup.exe`](https://github.com/pankaj886/application/releases/download/v1.0.6/Foreigners_Studio_1.0.0_x64-setup.exe).
2. The NSIS installer runs in **currentUser** mode (matching SpeakType architecture), installing directly to your user profile (`%LOCALAPPDATA%`) and **never triggering an Administrator UAC elevation barrier**.
3. If Microsoft Defender SmartScreen displays:  
   *`Windows protected your PC — Microsoft Defender SmartScreen prevented an unrecognized app from starting`*
   - Click **"More info"**
   - Click **"Run anyway"**
4. Complete the quick setup wizard. The application installs and launches immediately.

> **Why this happens:** Microsoft SmartScreen flags any newly published application until enough users have installed it to establish reputation. Once approved, the warning will not appear again.

---

#### Option B — Portable ZIP Bundle (With Auto-Unblocker)

1. **Download** [`Foreigners_Studio_Windows_x64.zip`](https://github.com/pankaj886/application/releases/download/v1.0.6/Foreigners_Studio_Windows_x64.zip).
2. Right-click the `.zip` file → select **Extract All**.
3. Inside the extracted folder, double-click **`Install-ForeignersStudio.bat`**.
4. The batch script removes web quarantine flags, registers the certificate, and opens Foreigners Studio directly.

---

## 🔒 Why Do Commercial Apps (and SpeakType) Install Without Warnings?

When you download apps like Google Chrome, Slack, VS Code, or SpeakType, they open without Gatekeeper warnings because:
- **Apple Developer Program ($99 USD/year):** An official *Developer ID Application* certificate is required (e.g., SpeakType uses `Developer ID Application: Karan Singh (PCV4UMSRZX)`). Binaries are submitted to Apple's cloud *Notary Service* (`notarytool`), which attaches a cryptographic ticket verifying the app was scanned by Apple.
- **Windows Code Signing Certificate ($300–$500 USD/year):** An Extended Validation (EV) or Organization Validation (OV) certificate issued by an official Certificate Authority (DigiCert, Sectigo, GlobalSign).

**Our CI/CD pipeline is already 100% configured for official notarization.** As soon as an Apple Developer Account is connected, builds will automatically sign and notarize without any code changes:

### How to Enable Official Zero-Warning Notarization in GitHub Actions

Add the following secrets in your GitHub repository (**Settings → Secrets and variables → Actions**). The workflow supports both SpeakType secret names and standard Tauri names:

| Standard Secret Name | SpeakType Alias | Description |
| :--- | :--- | :--- |
| `APPLE_CERTIFICATE` | `DEVELOPER_ID_APPLICATION_CERT` | Base64-encoded `Developer ID Application.p12` certificate file |
| `APPLE_CERTIFICATE_PASSWORD` | `DEVELOPER_ID_APPLICATION_CERT_PASSWORD` | Password for the `.p12` certificate |
| `APPLE_SIGNING_IDENTITY` | `DEVELOPER_ID_SIGNING_IDENTITY` | *(Optional)* Full identity name (e.g. `Developer ID Application: Your Name (TEAM_ID)`) |
| `APPLE_ID` | `NOTARIZATION_APPLE_ID` | Apple Developer Account email address |
| `APPLE_PASSWORD` | `NOTARIZATION_PASSWORD` | App-specific password generated at [appleid.apple.com](https://appleid.apple.com) |
| `APPLE_TEAM_ID` | `NOTARIZATION_TEAM_ID` | 10-character Apple Developer Team ID |
| `WINDOWS_CERT_BASE64` | — | *(Optional)* Base64-encoded Windows Code Signing `.pfx` file |
| `WINDOWS_CERT_PASSWORD` | — | *(Optional)* Password for the Windows `.pfx` certificate |

Once added, every new tag release will automatically be notarized by Apple and signed with your official certificates.

## 🔄 Real-Time Background Updates (1-Minute Frequency)

Foreigners Studio features an integrated background update engine:
- **Rapid Update Detection:** The app checks for new GitHub releases on startup (3-second delay) and continuously every **1 minute** in the background.
- **Zero Impact on Performance:** Each check is an ultra-lightweight, non-blocking asynchronous metadata query (<1 KB) that does not disrupt active user tasks.
- **Seamless In-Place Upgrades:** When an update is detected and downloaded, a glowing **"Restart to update"** button appears in the top title bar. Clicking it atomically swaps the binaries and re-launches the application with all user cache and sessions preserved.

---

## 🛡️ Security Architecture: Permanent Installers vs. Portable Executables

Foreigners Studio defaults to **Permanent Installation Packages** for both macOS and Windows because permanent installation provides superior security and reliability:

1. **Elimination of macOS Gatekeeper App Translocation:**
   - When a portable macOS application is executed from `~/Downloads`, macOS Gatekeeper isolates it inside a randomized read-only sandbox (`/private/var/folders/...`). This breaks local database persistence and prevents background self-updating.
   - Dragging the app to `/Applications` (via the DMG installer) establishes a permanent install, removes translocation, and grants permanent persistence for tokens and cache in `~/Library/Application Support/Foreigners Studio`.

2. **Windows Defender & Antivirus Reputation:**
   - Standalone portable `.exe` files executing out of `Downloads` or `Temp` are subjected to aggressive heuristic scans and quarantine by Microsoft Defender and enterprise EDRs.
   - The NSIS installer (`Foreigners_Studio_1.0.0_x64-setup.exe`) installs permanently to `%LOCALAPPDATA%\Programs\Foreigners Studio` in `currentUser` mode, completely avoiding the scary Administrator UAC prompt while establishing a trusted user directory.

3. **Persistent Cache & Data Integrity:**
   - Permanent installations reliably persist local SQLite/IndexedDB caches, session tokens, and configurations across system restarts, disk cleanups, and atomic in-place updates.

---

## 💻 System Compatibility

- **macOS:** macOS 11.0 (Big Sur) or newer. Universal binary natively supporting both **Apple Silicon (M1/M2/M3/M4)** and **Intel** Macs.
- **Windows:** Windows 10 (64-bit) or Windows 11 (64-bit). Includes Microsoft WebView2 runtime support.
