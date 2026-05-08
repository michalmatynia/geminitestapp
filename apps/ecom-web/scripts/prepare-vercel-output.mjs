import { cpSync, existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.VERCEL) {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const appRoot = resolve(scriptDir, '..');
  const repoRoot = resolve(appRoot, '../..');
  const appNextDir = resolve(appRoot, '.next');
  const rootNextDir = resolve(repoRoot, '.next');
  const appNodeModulesDir = resolve(appRoot, 'node_modules');
  const rootNodeModulesDir = resolve(repoRoot, 'node_modules');
  const routesManifest = resolve(appNextDir, 'routes-manifest.json');
  const deterministicRoutesManifest = resolve(appNextDir, 'routes-manifest-deterministic.json');

  if (existsSync(routesManifest) && !existsSync(deterministicRoutesManifest)) {
    cpSync(routesManifest, deterministicRoutesManifest);
  }

  if (appNextDir !== rootNextDir && existsSync(appNextDir)) {
    rmSync(rootNextDir, { recursive: true, force: true });
    mkdirSync(repoRoot, { recursive: true });
    cpSync(appNextDir, rootNextDir, { recursive: true });
  }

  if (!existsSync(rootNodeModulesDir) && existsSync(appNodeModulesDir)) {
    symlinkSync(appNodeModulesDir, rootNodeModulesDir, 'dir');
  }
}
