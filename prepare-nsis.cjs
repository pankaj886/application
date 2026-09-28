const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const nsisDir = path.join(process.env.LOCALAPPDATA, 'tauri', 'NSIS');
if (!fs.existsSync(nsisDir)) {
  fs.mkdirSync(nsisDir, { recursive: true });
}

const zipPath = path.join(nsisDir, 'nsis-3.11.zip');
if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size < 1000000) {
  console.log('Downloading nsis-3.11.zip...');
  execSync(`curl.exe -s -L "https://github.com/tauri-apps/binary-releases/releases/download/nsis-3.11/nsis-3.11.zip" -o "${zipPath}"`);
}

console.log('Extracting nsis-3.11.zip...');
const tempDir = path.join(nsisDir, 'temp_extract');
if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
execSync(`powershell.exe -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tempDir}' -Force"`);

// Copy all files from temp_extract/nsis-3.11 into nsisDir
const extractedRoot = path.join(tempDir, 'nsis-3.11');
function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    if (fs.statSync(s).isDirectory()) {
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}
copyRecursive(extractedRoot, nsisDir);
fs.rmSync(tempDir, { recursive: true, force: true });

// Setup Plugins/x86-unicode/additional/nsis_tauri_utils.dll
const addDir = path.join(nsisDir, 'Plugins', 'x86-unicode', 'additional');
if (!fs.existsSync(addDir)) fs.mkdirSync(addDir, { recursive: true });

const dllPath = path.join(addDir, 'nsis_tauri_utils.dll');
console.log('Downloading nsis_tauri_utils.dll...');
execSync(`curl.exe -s -L "https://github.com/tauri-apps/nsis-tauri-utils/releases/download/nsis_tauri_utils-v0.5.3/nsis_tauri_utils.dll" -o "${dllPath}"`);

// Verify all 12 items
const files = [
  'Bin/makensis.exe',
  'Stubs/lzma-x86-unicode',
  'Stubs/lzma_solid-x86-unicode',
  'Plugins/x86-unicode/additional/nsis_tauri_utils.dll',
  'Include/MUI2.nsh',
  'Include/FileFunc.nsh',
  'Include/x64.nsh',
  'Include/nsDialogs.nsh',
  'Include/WinMessages.nsh',
  'Include/Win/COM.nsh',
  'Include/Win/Propkey.nsh',
  'Include/Win/RestartManager.nsh'
];

let allOk = true;
for (const f of files) {
  const full = path.join(nsisDir, ...f.split('/'));
  const exists = fs.existsSync(full);
  let hash = '';
  if (exists && f.includes('nsis_tauri_utils')) {
    const data = fs.readFileSync(full);
    hash = crypto.createHash('sha1').update(data).digest('hex').toUpperCase();
  }
  console.log(exists ? '✓' : '✗', f, hash);
  if (!exists) allOk = false;
}

if (allOk) {
  console.log('🎉 NSIS toolset fully installed and verified!');
} else {
  console.error('❌ Some files are missing!');
  process.exit(1);
}
