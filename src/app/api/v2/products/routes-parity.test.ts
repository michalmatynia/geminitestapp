import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '../../../../..');

const legacyRoot = path.join(projectRoot, 'src/app/api/products');
const v2Root = path.join(projectRoot, 'src/app/api/v2/products');

const collectRouteFiles = (baseDir: string): string[] => {
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
      if (entry.isFile() && entry.name === 'route.ts') {
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

  it('keeps /api/v2/products route.ts files available', () => {
    const v2Routes = collectRouteFiles(v2Root);
    expect(v2Routes.length).toBeGreaterThan(0);
  });

  it('does not import v2 routes from removed legacy products namespace', () => {
    const v2Routes = collectRouteFiles(v2Root);
    const offenders = v2Routes.filter((relativeRoute) =>
      readRouteSource(v2Root, relativeRoute).includes("@/app/api/products/")
    );

    expect(offenders).toEqual([]);
  });

  it('provides a /api/v2/products route.ts counterpart for every historical legacy route', () => {
    const historicalLegacyRoutes = [
      '[id]/duplicate/route.ts',
      '[id]/images/[imageFileId]/route.ts',
      '[id]/images/base64/route.ts',
      '[id]/images/link-to-file/route.ts',
      '[id]/route.ts',
      '[id]/studio/[action]/route.ts',
      '[id]/studio/route.ts',
      'ai-jobs/[jobId]/route.ts',
      'ai-jobs/bulk/route.ts',
      'ai-jobs/enqueue/route.ts',
      'ai-jobs/route.ts',
      'ai-paths/description-context/route.ts',
      'categories/[id]/route.ts',
      'categories/batch/route.ts',
      'categories/migrate/route.ts',
      'categories/reorder/route.ts',
      'categories/route.ts',
      'categories/tree/route.ts',
      'count/route.ts',
      'images/base64/all/route.ts',
      'images/base64/route.ts',
      'images/upload/route.ts',
      'migrate/route.ts',
      'paged/route.ts',
      'parameters/[id]/route.ts',
      'parameters/route.ts',
      'producers/[id]/route.ts',
      'producers/route.ts',
      'route.ts',
      'sync/profiles/[id]/route.ts',
      'sync/profiles/[id]/run/route.ts',
      'sync/profiles/route.ts',
      'sync/relink/route.ts',
      'sync/runs/[runId]/route.ts',
      'sync/runs/route.ts',
      'tags/[id]/route.ts',
      'tags/all/route.ts',
      'tags/route.ts',
      'validation/route.ts',
      'validator-config/route.ts',
      'validator-decisions/route.ts',
      'validator-patterns/[id]/route.ts',
      'validator-patterns/import/route.ts',
      'validator-patterns/reorder/route.ts',
      'validator-patterns/route.ts',
      'validator-runtime/evaluate/route.ts',
      'validator-settings/route.ts',
    ];

    const legacyRoutes = collectRouteFiles(legacyRoot);
    const v2Routes = new Set(collectRouteFiles(v2Root));

    expect(legacyRoutes).toEqual([]);

    const missing = historicalLegacyRoutes.filter((relativeRoute) => !v2Routes.has(relativeRoute));

    expect(missing).toEqual([]);
  });
});
