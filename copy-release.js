import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetBase = path.join(__dirname, 'src-tauri', 'target');
const releaseOutDir = path.join(__dirname, 'dist-release');

if (!fs.existsSync(releaseOutDir)) {
  fs.mkdirSync(releaseOutDir, { recursive: true });
}

console.log('[Release Bundler] Scanning for build artifacts in:', targetBase);

// 1. WINDOWS BINARIES & DLL
const winTargetDirs = [
  path.join(targetBase, 'release'),
  path.join(targetBase, 'x86_64-pc-windows-gnu', 'release'),
  path.join(targetBase, 'x86_64-pc-windows-msvc', 'release'),
  path.join(targetBase, 'debug')
];

for (const targetDir of winTargetDirs) {
  const exePath = path.join(targetDir, 'foreigners_studio.exe');
  if (fs.existsSync(exePath)) {
    const dest = path.join(releaseOutDir, 'foreigners_studio.exe');
    try {
      fs.copyFileSync(exePath, dest);
      console.log('✓ Copied Windows executable ->', dest);
      break;
    } catch (err) {
      if (err.code !== 'EBUSY') console.warn('Could not copy exe:', err.message);
    }
  }
}

// 2. WINDOWS NSIS / MSI INSTALLERS
const winBundleDirs = [
  path.join(targetBase, 'release', 'bundle'),
  path.join(targetBase, 'x86_64-pc-windows-msvc', 'release', 'bundle'),
  path.join(targetBase, 'x86_64-pc-windows-gnu', 'release', 'bundle')
];

for (const bDir of winBundleDirs) {
  if (!fs.existsSync(bDir)) continue;

  const nsisDir = path.join(bDir, 'nsis');
  if (fs.existsSync(nsisDir)) {
    const files = fs.readdirSync(nsisDir).filter(f => f.endsWith('.exe') || f.endsWith('.zip'));
    for (const file of files) {
      try {
        fs.copyFileSync(path.join(nsisDir, file), path.join(releaseOutDir, file));
        console.log('✓ Copied Windows NSIS installer ->', file);
      } catch (err) {}
    }
  }

  const msiDir = path.join(bDir, 'msi');
  if (fs.existsSync(msiDir)) {
    const files = fs.readdirSync(msiDir).filter(f => f.endsWith('.msi') || f.endsWith('.zip'));
    for (const file of files) {
      try {
        fs.copyFileSync(path.join(msiDir, file), path.join(releaseOutDir, file));
        console.log('✓ Copied Windows MSI installer ->', file);
      } catch (err) {}
    }
  }
}

// 3. MACOS BUNDLES (.dmg & .app)
const macBundleDirs = [
  path.join(targetBase, 'universal-apple-darwin', 'release', 'bundle'),
  path.join(targetBase, 'release', 'bundle'),
  path.join(targetBase, 'aarch64-apple-darwin', 'release', 'bundle'),
  path.join(targetBase, 'x86_64-apple-darwin', 'release', 'bundle')
];

for (const bDir of macBundleDirs) {
  if (!fs.existsSync(bDir)) continue;

  const dmgDir = path.join(bDir, 'dmg');
  if (fs.existsSync(dmgDir)) {
    const files = fs.readdirSync(dmgDir).filter(f => f.endsWith('.dmg') || f.endsWith('.tar.gz'));
    for (const file of files) {
      try {
        fs.copyFileSync(path.join(dmgDir, file), path.join(releaseOutDir, file));
        console.log('✓ Copied macOS DMG bundle ->', file);
      } catch (err) {}
    }
  }

  const appDir = path.join(bDir, 'macos');
  if (fs.existsSync(appDir)) {
    const apps = fs.readdirSync(appDir).filter(f => f.endsWith('.app'));
    for (const app of apps) {
      const src = path.join(appDir, app);
      const dest = path.join(releaseOutDir, app);
      try {
        if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
        fs.cpSync(src, dest, { recursive: true });
        console.log('✓ Copied macOS App bundle ->', app);
      } catch (err) {}
    }
  }
}

console.log('[Release Bundler] Completed scanning. Ready in dist-release/');
