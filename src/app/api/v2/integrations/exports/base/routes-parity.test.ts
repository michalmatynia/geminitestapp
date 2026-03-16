import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '../../../../../../..');

const legacyRoot = path.join(projectRoot, 'src/app/api/integrations/exports/base');
const v2Root = path.join(projectRoot, 'src/app/api/v2/integrations/exports/base');
const featuresRoot = path.join(projectRoot, 'src/features');
const productsApiRoot = path.join(projectRoot, 'src/app/api/v2/integrations/products');
const baseConnectionsApiRoot = path.join(
  projectRoot,
  'src/app/api/v2/integrations/[id]/connections/[connectionId]/base'
);
const baseImageSyncServiceFile = path.join(
  projectRoot,
  'src/features/integrations/services/base-image-sync.ts'
);
const productSyncServiceFile = path.join(
  projectRoot,
  'src/features/product-sync/services/product-sync-service.ts'
);
const starterWorkflowsRoot = path.join(
  projectRoot,
  'src/shared/lib/ai-paths/core/starter-workflows/assets'
);
const legacyEndpointToken = '/api/integrations/exports/base';
const legacyApiImportToken = '@/app/api/integrations/exports/base/';
const legacyPasswordTokenFallbackPattern = /connection\.password|source:\s*['"]password['"]/;
const expectedV2RoutePaths = ['[setting]/route-handler.ts'] as const;

const collectRouteFiles = (baseDir: string, fileName = 'route.ts'): string[] => {
  if (!existsSync(baseDir)) return [];

  const walk = (dir: string): string[] => {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];

    entries.forEach((entry) => {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...walk(absolute));
        return;
      }
      if (entry.isFile() && entry.name === fileName) {
        files.push(path.relative(baseDir, absolute));
      }
    });

    return files;
  };

  return walk(baseDir).sort();
};

const collectSourceFiles = (baseDir: string): string[] => {
  if (!existsSync(baseDir)) return [];

  const supported = new Set(['.ts', '.tsx', '.js', '.jsx', '.json']);

  const walk = (dir: string): string[] => {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];

    entries.forEach((entry) => {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...walk(absolute));
        return;
      }
      if (entry.isFile() && supported.has(path.extname(entry.name))) {
        files.push(absolute);
      }
    });

    return files;
  };

  return walk(baseDir).sort();
};

describe('v2 integrations exports/base route migration', () => {
  it('keeps expected /api/v2/integrations/exports/base route-handler files present', () => {
    const v2Routes = new Set(collectRouteFiles(v2Root, 'route-handler.ts'));
    const missing = expectedV2RoutePaths.filter((relativeRoute) => !v2Routes.has(relativeRoute));
    expect(missing).toEqual([]);
  });

  it('removes legacy /api/integrations/exports/base route.ts files', () => {
    const legacyRoutes = collectRouteFiles(legacyRoot);
    expect(legacyRoutes).toEqual([]);
  });

  it('keeps v2 route-handler files independent from legacy api namespace imports', () => {
    const v2Routes = collectRouteFiles(v2Root, 'route-handler.ts');
    const offenders = v2Routes.filter((relativeRoute) =>
      readFileSync(path.join(v2Root, relativeRoute), 'utf8').includes(legacyApiImportToken)
    );

    expect(offenders).toEqual([]);
  });

  it('avoids legacy exports/base endpoint literals in feature runtime code', () => {
    const featureFiles = collectSourceFiles(featuresRoot);
    const offenders = featureFiles
      .filter((absolute) => readFileSync(absolute, 'utf8').includes(legacyEndpointToken))
      .map((absolute) => path.relative(projectRoot, absolute));

    expect(offenders).toEqual([]);
  });

  it('avoids legacy exports/base endpoint literals in starter workflow assets', () => {
    const assetFiles = collectSourceFiles(starterWorkflowsRoot);
    const offenders = assetFiles
      .filter((absolute) => readFileSync(absolute, 'utf8').includes(legacyEndpointToken))
      .map((absolute) => path.relative(projectRoot, absolute));

    expect(offenders).toEqual([]);
  });

  it('avoids legacy password token fallback in exports runtime code', () => {
    const candidateFiles = [
      ...collectSourceFiles(v2Root),
      ...collectSourceFiles(productsApiRoot),
      ...collectSourceFiles(baseConnectionsApiRoot),
      baseImageSyncServiceFile,
      productSyncServiceFile,
    ].filter((absolute, index, all) => existsSync(absolute) && all.indexOf(absolute) === index);
    const offenders = candidateFiles
      .filter((absolute) => legacyPasswordTokenFallbackPattern.test(readFileSync(absolute, 'utf8')))
      .map((absolute) => path.relative(projectRoot, absolute));

    expect(offenders).toEqual([]);
  });
});
