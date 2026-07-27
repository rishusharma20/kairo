import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXTENSION_DIR = __dirname;
const DIST_DIR = path.join(EXTENSION_DIR, 'dist');
const TSCONFIG_PATH = path.join(EXTENSION_DIR, 'tsconfig.json');
const MANIFEST_PATH = path.join(EXTENSION_DIR, 'manifest.json');

console.log('Building Kairo Extension Foundation...');

// 1. Clean dist directory
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DIST_DIR, { recursive: true });

// 2. Compile TypeScript
try {
  // Use local tsc (we run this via npm run extension:build so tsc is in path)
  execSync(`npx tsc -p "${TSCONFIG_PATH}"`, { stdio: 'inherit' });
} catch (_) {
  console.error('TypeScript compilation failed.');
  process.exit(1);
}

// 3. Copy Manifest
try {
  fs.copyFileSync(MANIFEST_PATH, path.join(DIST_DIR, 'manifest.json'));
} catch (_) {
  console.error('Failed to copy manifest.json.');
  process.exit(1);
}

// 4. Copy Icons
try {
  const assetsIconDir = path.join(EXTENSION_DIR, 'assets', 'icons');
  const distIconDir = path.join(DIST_DIR, 'icons');
  if (fs.existsSync(assetsIconDir)) {
    fs.mkdirSync(distIconDir, { recursive: true });
    const icons = fs.readdirSync(assetsIconDir);
    for (const icon of icons) {
      if (icon.endsWith('.png')) {
        fs.copyFileSync(path.join(assetsIconDir, icon), path.join(distIconDir, icon));
      }
    }
    console.log('Copied icons to dist.');
  }
} catch (err) {
  console.error('Failed to copy icons:', err);
  process.exit(1);
}

console.log('Build completed successfully. Output in extension/dist/');
