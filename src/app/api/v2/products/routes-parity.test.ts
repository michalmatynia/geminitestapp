import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '../../../../..');

const legacyRoot = path.join(projectRoot, 'src/app/api/products');
const legacyCatalogsRoot = path.join(projectRoot, 'src/app/api/catalogs');
const v2Root = path.join(projectRoot, 'src/app/api/v2/products');
const legacyImportAliasRoute = path.join(projectRoot, 'src/app/api/import/route.ts');

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

const readRouteSource = (baseDir: string, relativeRoute: string): string =>
  readFileSync(path.join(baseDir, relativeRoute), 'utf8');

describe('v2 products route migration', () => {
  it('removes legacy /api/products route.ts files', () => {
    const legacyRoutes = collectRouteFiles(legacyRoot);
    expect(legacyRoutes).toEqual([]);
  });

  it('removes legacy /api/catalogs route.ts files', () => {
    const legacyCatalogRoutes = collectRouteFiles(legacyCatalogsRoot);
    expect(legacyCatalogRoutes).toEqual([]);
  });

  it('keeps /api/v2/products catch-all route.ts file present', () => {
    const v2Routes = collectRouteFiles(v2Root);
    expect(v2Routes).toEqual(['[[...path]]/route.ts']);
  });

  it('keeps canonical /api/v2/products/import/csv route-handler file present', () => {
    const v2Routes = new Set(collectRouteFiles(v2Root, 'route-handler.ts'));
    expect(v2Routes.has('import/csv/route-handler.ts')).toBe(true);
  });

  it('keeps canonical /api/v2/products/entities/[type] route-handler file present', () => {
    const v2Routes = new Set(collectRouteFiles(v2Root, 'route-handler.ts'));
    expect(v2Routes.has('entities/[type]/route-handler.ts')).toBe(true);
  });

  it('keeps canonical /api/v2/products/entities/catalogs/assign route-handler file present', () => {
    const v2Routes = new Set(collectRouteFiles(v2Root, 'route-handler.ts'));
    expect(v2Routes.has('entities/catalogs/assign/route-handler.ts')).toBe(true);
  });

  it('removes legacy /api/import alias route.ts file', () => {
    expect(existsSync(legacyImportAliasRoute)).toBe(false);
  });

  it('does not import v2 routes from removed legacy products namespace', () => {
    const v2Routes = [
      ...collectRouteFiles(v2Root, 'route.ts'),
      ...collectRouteFiles(v2Root, 'route-handler.ts'),
    ];
    const offenders = v2Routes.filter((relativeRoute) =>
      readRouteSource(v2Root, relativeRoute).includes('@/app/api/products/')
    );

    expect(offenders).toEqual([]);
  });

  it('provides a /api/v2/products route-handler counterpart for every historical legacy route', () => {
    const historicalLegacyRoutes = [
      '[id]/duplicate/route-handler.ts',
      '[id]/images/[imageFileId]/route-handler.ts',
      '[id]/images/base64/route-handler.ts',
      '[id]/images/link-to-file/route-handler.ts',
      '[id]/route-handler.ts',
      '[id]/studio/[action]/route-handler.ts',
      '[id]/studio/route-handler.ts',
      'ai-jobs/[jobId]/route-handler.ts',
      'ai-jobs/bulk/route-handler.ts',
      'ai-jobs/enqueue/route-handler.ts',
      'ai-jobs/route-handler.ts',
      'ai-paths/description-context/route-handler.ts',
      'categories/[id]/route-handler.ts',
      'categories/batch/route-handler.ts',
      'categories/migrate/route-handler.ts',
      'categories/reorder/route-handler.ts',
      'categories/route-handler.ts',
      'categories/tree/route-handler.ts',
      'count/route-handler.ts',
      'images/base64/all/route-handler.ts',
      'images/base64/route-handler.ts',
      'images/upload/route-handler.ts',
      'paged/route-handler.ts',
      'parameters/[id]/route-handler.ts',
      'parameters/route-handler.ts',
      'producers/[id]/route-handler.ts',
      'producers/route-handler.ts',
      'route-handler.ts',
      'sync/profiles/[id]/route-handler.ts',
      'sync/profiles/[id]/run/route-handler.ts',
      'sync/profiles/route-handler.ts',
      'sync/relink/route-handler.ts',
      'sync/runs/[runId]/route-handler.ts',
      'sync/runs/route-handler.ts',
      'tags/[id]/route-handler.ts',
      'tags/all/route-handler.ts',
      'tags/route-handler.ts',
      'validation/route-handler.ts',
      'validator-config/route-handler.ts',
      'validator-decisions/batch/route-handler.ts',
      'validator-decisions/route-handler.ts',
      'validator-patterns/[id]/route-handler.ts',
      'validator-patterns/import/route-handler.ts',
      'validator-patterns/reorder/route-handler.ts',
      'validator-patterns/route-handler.ts',
      'validator-runtime/evaluate/route-handler.ts',
      'validator-settings/route-handler.ts',
    ];

    const legacyRoutes = collectRouteFiles(legacyRoot);
    const v2Routes = new Set(collectRouteFiles(v2Root, 'route-handler.ts'));

    expect(legacyRoutes).toEqual([]);

    const missing = historicalLegacyRoutes.filter((relativeRoute) => !v2Routes.has(relativeRoute));

    expect(missing).toEqual([]);
  });
});
