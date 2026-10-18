// Ensures workspace packages (@nati-lotto/shared-types, @nati-lotto/config, @nati-lotto/validation)
// are precompiled before compiling NestJS or running in serverless / container environments.

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('[build-packages] Ensuring workspace packages are built...');

const apiDir = path.resolve(__dirname, '..');
const candidatePackageDirs = [
  path.resolve(apiDir, '../../packages'),
  path.resolve(apiDir, '../packages'),
  path.resolve(process.cwd(), '../../packages'),
  path.resolve(process.cwd(), '../packages'),
  path.resolve(process.cwd(), 'packages'),
];

const packagesDir = candidatePackageDirs.find((dir) => fs.existsSync(dir));

if (!packagesDir) {
  console.warn('[build-packages] packages directory not found in candidate locations:', candidatePackageDirs);
  process.exit(0);
}

// Find local tsc binary from apps/api/node_modules/typescript or monorepo root
const candidateTscPaths = [
  path.join(apiDir, 'node_modules', 'typescript', 'bin', 'tsc'),
  path.resolve(__dirname, '../../../node_modules/typescript/bin/tsc'),
];
const localTsc = candidateTscPaths.find((p) => fs.existsSync(p));

const packages = ['shared-types', 'config', 'validation'];

for (const pkg of packages) {
  const pkgDir = path.join(packagesDir, pkg);
  const tsconfigPath = path.join(pkgDir, 'tsconfig.json');
  const pkgDist = path.join(pkgDir, 'dist');

  if (!fs.existsSync(pkgDir) || !fs.existsSync(tsconfigPath)) {
    continue;
  }

  console.log(`[build-packages] Building @nati-lotto/${pkg}...`);
  try {
    if (localTsc) {
      execSync(`node "${localTsc}" --project "${tsconfigPath}"`, {
        stdio: 'inherit',
        cwd: pkgDir,
        env: process.env,
      });
    } else {
      execSync(`npx tsc --project "${tsconfigPath}"`, {
        stdio: 'inherit',
        cwd: pkgDir,
        env: process.env,
      });
    }
  } catch (err) {
    if (fs.existsSync(pkgDist)) {
      console.warn(`[build-packages] Warning: Compiling @nati-lotto/${pkg} had errors, but existing dist/ will be used.`);
    } else {
      console.error(`[build-packages] Failed to build @nati-lotto/${pkg}:`, err.message);
      if (pkg === 'shared-types' || pkg === 'config') {
        process.exit(1);
      }
    }
  }

  // Ensure node_modules/@nati-lotto/<pkg> has dist files if it was copied by npm instead of symlinked
  const nodeModulesPkg = path.join(apiDir, 'node_modules', '@nati-lotto', pkg);
  if (fs.existsSync(pkgDist) && fs.existsSync(nodeModulesPkg)) {
    try {
      const stat = fs.lstatSync(nodeModulesPkg);
      if (!stat.isSymbolicLink()) {
        const targetDist = path.join(nodeModulesPkg, 'dist');
        fs.mkdirSync(targetDist, { recursive: true });
        fs.cpSync(pkgDist, targetDist, { recursive: true, force: true });
      }
    } catch (err) {
      // ignore copy errors
    }
  }
}

console.log('[build-packages] Workspace packages ready.');
