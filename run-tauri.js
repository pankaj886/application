import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

if (process.platform === 'win32') {
  const cargoBin = path.join(os.homedir(), '.cargo', 'bin');
  const mingwBin = 'C:\\mingw64\\bin';
  const currentPath = process.env.PATH || '';
  const paths = currentPath.split(path.delimiter);

  const toAdd = [];
  if (!paths.some(p => p.toLowerCase() === cargoBin.toLowerCase())) {
    toAdd.push(cargoBin);
  }
  if (!paths.some(p => p.toLowerCase() === mingwBin.toLowerCase())) {
    toAdd.push(mingwBin);
  }

  if (toAdd.length > 0) {
    process.env.PATH = `${toAdd.join(path.delimiter)}${path.delimiter}${currentPath}`;
  }
}

const require = createRequire(import.meta.url);
const cli = require('@tauri-apps/cli/main');

const args = process.argv.slice(2);
cli.run(args, 'npm run tauri').catch((err) => {
  cli.logError(err.message);
  process.exit(1);
});
