import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXTENSION_DIR = __dirname;
const DIST_DIR = path.join(EXTENSION_DIR, 'dist');
const DIST_FIREFOX_DIR = path.join(EXTENSION_DIR, 'dist-firefox');
const DIST_FIREFOX_PRIVATE_DIR = path.join(EXTENSION_DIR, 'dist-firefox-private');
const TSCONFIG_PATH = path.join(EXTENSION_DIR, 'tsconfig.json');
const MANIFEST_PATH = path.join(EXTENSION_DIR, 'manifest.json');

console.log('Building Kairo Extension Foundation for Chrome & Firefox (Standard & Private)...');

// 1. Clean dist directories
for (const dir of [DIST_DIR, DIST_FIREFOX_DIR, DIST_FIREFOX_PRIVATE_DIR]) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

// 2. Bundle TypeScript with esbuild
try {
  const tsFiles = ['background.ts', 'content.ts'];
  for (const file of tsFiles) {
    const entryPath = path.join(EXTENSION_DIR, 'src', file);
    const outPath = path.join(DIST_DIR, file.replace('.ts', '.js'));
    // We use iife format for content and pageContext since they run in browsers without module loaders usually, 
    // but background uses module format in manifest (type="module"). Let's use ESM for all if content scripts support it.
    // Actually, Chrome MV3 supports type="module" in background, but NOT cleanly in content scripts out of the box in all cases unless configured, 
    // but esbuild defaults to an IIFE for standard bundles without --format=esm.
    // background.js is loaded as module. We'll build everything as standard bundle (IIFE for content, ESM for background)
    const format = file === 'background.ts' ? '--format=esm' : '--format=iife';
    execSync(`npx esbuild "${entryPath}" --bundle --outfile="${outPath}" ${format} --target=es2022 --minify`, { stdio: 'inherit' });
  }
} catch (err) {
  console.error('esbuild compilation failed:', err);
  process.exit(1);
}

// Copy compiled JS files to Firefox dist directories
const copyJsFiles = ['background.js', 'content.js'];
for (const file of copyJsFiles) {
  const src = path.join(DIST_DIR, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(DIST_FIREFOX_DIR, file));
    fs.copyFileSync(src, path.join(DIST_FIREFOX_PRIVATE_DIR, file));
  }
}

// 3. Copy Icons to all dist directories
try {
  const assetsIconDir = path.join(EXTENSION_DIR, 'assets', 'icons');
  const distIconDir = path.join(DIST_DIR, 'icons');
  const firefoxIconDir = path.join(DIST_FIREFOX_DIR, 'icons');
  const firefoxPrivateIconDir = path.join(DIST_FIREFOX_PRIVATE_DIR, 'icons');

  if (fs.existsSync(assetsIconDir)) {
    fs.mkdirSync(distIconDir, { recursive: true });
    fs.mkdirSync(firefoxIconDir, { recursive: true });
    fs.mkdirSync(firefoxPrivateIconDir, { recursive: true });

    const icons = fs.readdirSync(assetsIconDir);
    for (const icon of icons) {
      if (icon.endsWith('.png')) {
        fs.copyFileSync(path.join(assetsIconDir, icon), path.join(distIconDir, icon));
        fs.copyFileSync(path.join(assetsIconDir, icon), path.join(firefoxIconDir, icon));
        fs.copyFileSync(path.join(assetsIconDir, icon), path.join(firefoxPrivateIconDir, icon));
      }
    }
    console.log('Copied icons to dist, dist-firefox, and dist-firefox-private.');
  }
} catch (err) {
  console.error('Failed to copy icons:', err);
  process.exit(1);
}

// 4. Chrome Manifest
try {
  fs.copyFileSync(MANIFEST_PATH, path.join(DIST_DIR, 'manifest.json'));
} catch (_) {
  console.error('Failed to copy Chrome manifest.json.');
  process.exit(1);
}

// 5. Firefox Manifests (Standard & Private with Unique ID)
try {
  const baseManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  
  // Standard Firefox Manifest
  const firefoxManifest = {
    ...baseManifest,
    browser_specific_settings: {
      gecko: {
        id: "kairo@kairo.ai",
        strict_min_version: "109.0",
        data_collection_permissions: {
          required: ["none"]
        }
      }
    },
    background: {
      scripts: ["background.js"]
    }
  };
  fs.writeFileSync(path.join(DIST_FIREFOX_DIR, 'manifest.json'), JSON.stringify(firefoxManifest, null, 2));

  // Private Firefox Manifest (Guaranteed Unique Non-colliding ID for private AMO upload)
  const uniquePrivateId = `kairo-private-${Math.floor(Date.now() / 1000)}@kairo.ai`;
  const firefoxPrivateManifest = {
    ...baseManifest,
    name: "Kairo (Private)",
    browser_specific_settings: {
      gecko: {
        id: uniquePrivateId,
        strict_min_version: "109.0",
        data_collection_permissions: {
          required: ["none"]
        }
      }
    },
    background: {
      scripts: ["background.js"]
    }
  };
  fs.writeFileSync(path.join(DIST_FIREFOX_PRIVATE_DIR, 'manifest.json'), JSON.stringify(firefoxPrivateManifest, null, 2));

  console.log(`Generated Firefox manifests (Standard ID: kairo@kairo.ai | Private Unique ID: ${uniquePrivateId}).`);
} catch (err) {
  console.error('Failed to create Firefox manifests:', err);
  process.exit(1);
}

// 6. Create Zip files
const target = process.argv[2];

try {
  if (!target || target !== 'firefox') {
    const chromeZipPath = path.join(EXTENSION_DIR, 'kairo-extension.zip');
    if (fs.existsSync(chromeZipPath)) fs.unlinkSync(chromeZipPath);
    execSync(`cd "${DIST_DIR}" && zip -q -r "${chromeZipPath}" .`, { stdio: 'inherit' });
    console.log(`Created Chrome extension zip: ${chromeZipPath}`);
  }

  const firefoxZipPath = path.join(EXTENSION_DIR, 'kairo-firefox-extension.zip');
  if (fs.existsSync(firefoxZipPath)) fs.unlinkSync(firefoxZipPath);

  execSync(`cd "${DIST_FIREFOX_DIR}" && zip -q -r "${firefoxZipPath}" .`, { stdio: 'inherit' });
  console.log(`Created Firefox standard extension zip: ${firefoxZipPath}`);

  if (!target || target !== 'firefox') {
    const firefoxAltZipPath = path.join(EXTENSION_DIR, 'kairo-extension-firefox.zip');
    if (fs.existsSync(firefoxAltZipPath)) fs.unlinkSync(firefoxAltZipPath);
    fs.copyFileSync(firefoxZipPath, firefoxAltZipPath);
    
    const firefoxPrivateZipPath = path.join(EXTENSION_DIR, 'kairo-private-firefox-extension.zip');
    if (fs.existsSync(firefoxPrivateZipPath)) fs.unlinkSync(firefoxPrivateZipPath);
    execSync(`cd "${DIST_FIREFOX_PRIVATE_DIR}" && zip -q -r "${firefoxPrivateZipPath}" .`, { stdio: 'inherit' });
    console.log(`Created Firefox PRIVATE extension zip: ${firefoxPrivateZipPath}`);
  }
} catch (err) {
  console.error('Failed to create extension zip files:', err);
  process.exit(1);
}

console.log('Build completed successfully.');


