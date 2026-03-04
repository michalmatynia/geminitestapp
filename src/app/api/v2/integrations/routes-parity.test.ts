import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '../../../../..');

const v2Root = path.join(projectRoot, 'src/app/api/v2/integrations');
const featuresRoot = path.join(projectRoot, 'src/features');
const sharedRoot = path.join(projectRoot, 'src/shared');

const migratedRoutePaths = [
  'route.ts',
  'with-connections/route.ts',
  'jobs/route.ts',
  'queues/tradera/route.ts',
  'product-listings/route.ts',
  'images/sync-base/all/route.ts',
  '[id]/connections/route.ts',
  'connections/[id]/route.ts',
  'connections/[id]/session/route.ts',
  '[id]/connections/[connectionId]/test/route.ts',
  '[id]/connections/[connectionId]/base/test/route.ts',
  '[id]/connections/[connectionId]/allegro/test/route.ts',
  '[id]/connections/[connectionId]/base/request/route.ts',
  '[id]/connections/[connectionId]/allegro/request/route.ts',
  '[id]/connections/[connectionId]/allegro/disconnect/route.ts',
  '[id]/connections/[connectionId]/allegro/authorize/route.ts',
  '[id]/connections/[connectionId]/allegro/callback/route.ts',
  '[id]/connections/[connectionId]/base/inventories/route.ts',
  '[id]/connections/[connectionId]/base/products/route.ts',
  'products/[id]/base/sku-check/route.ts',
  'products/[id]/base/link-existing/route.ts',
  'products/[id]/export-to-base/route.ts',
  'products/[id]/listings/route.ts',
  'products/[id]/listings/[listingId]/route.ts',
  'products/[id]/listings/[listingId]/delete-from-base/route.ts',
  'products/[id]/listings/[listingId]/purge/route.ts',
  'products/[id]/listings/[listingId]/relist/route.ts',
  'products/[id]/listings/[listingId]/sync-base-images/route.ts',
] as const;

const removedLegacyAliasRoutes = [
  'route.ts',
  '[id]/connections/route.ts',
  'connections/[id]/route.ts',
  'connections/[id]/session/route.ts',
  '[id]/connections/[connectionId]/test/route.ts',
  '[id]/connections/[connectionId]/base/test/route.ts',
  '[id]/connections/[connectionId]/allegro/test/route.ts',
  '[id]/connections/[connectionId]/base/request/route.ts',
  '[id]/connections/[connectionId]/allegro/request/route.ts',
  '[id]/connections/[connectionId]/allegro/disconnect/route.ts',
  '[id]/connections/[connectionId]/allegro/authorize/route.ts',
  '[id]/connections/[connectionId]/allegro/callback/route.ts',
  '[id]/connections/[connectionId]/base/inventories/route.ts',
  '[id]/connections/[connectionId]/base/products/route.ts',
  'products/[id]/base/sku-check/route.ts',
  'products/[id]/base/link-existing/route.ts',
  'products/[id]/export-to-base/route.ts',
  'products/[id]/listings/route.ts',
  'products/[id]/listings/[listingId]/route.ts',
  'products/[id]/listings/[listingId]/delete-from-base/route.ts',
  'products/[id]/listings/[listingId]/purge/route.ts',
  'products/[id]/listings/[listingId]/relist/route.ts',
  'products/[id]/listings/[listingId]/sync-base-images/route.ts',
] as const;

const migratedLegacyEndpointTokens = [
  '/api/integrations/',
  '/api/integrations/with-connections',
  '/api/integrations/jobs',
  '/api/integrations/queues/tradera',
  '/api/integrations/product-listings',
  '/api/integrations/images/sync-base/all',
  '/api/integrations/products/',
] as const;

const collectSourceFiles = (baseDir: string): string[] => {
  if (!existsSync(baseDir)) return [];

  const supported = new Set(['.ts', '.tsx', '.js', '.jsx']);

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

const collectHandlerFiles = (baseDir: string): string[] => {
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
      if (entry.isFile() && entry.name === 'handler.ts') {
        files.push(path.relative(baseDir, absolute));
      }
    });

    return files;
  };

  return walk(baseDir).sort();
};

describe('v2 integrations selected route migration', () => {
  it('keeps selected v2 route.ts files present', () => {
    const missing = migratedRoutePaths.filter(
      (relativeRoute) => !existsSync(path.join(v2Root, relativeRoute))
    );
    expect(missing).toEqual([]);
  });

  it('keeps selected v2 route.ts files independent from direct legacy api imports', () => {
    const offenders = migratedRoutePaths.filter((relativeRoute) => {
      const source = readFileSync(path.join(v2Root, relativeRoute), 'utf8');
      return source.includes("@/app/api/integrations/");
    });

    expect(offenders).toEqual([]);
  });

  it('keeps v2 handler.ts files independent from direct legacy api imports', () => {
    const v2Handlers = collectHandlerFiles(v2Root);
    const offenders = v2Handlers.filter((relativePath) => {
      const source = readFileSync(path.join(v2Root, relativePath), 'utf8');
      return source.includes("@/app/api/integrations/");
    });

    expect(offenders).toEqual([]);
  });

  it('removes migrated legacy alias route.ts files', () => {
    const legacyRoot = path.join(projectRoot, 'src/app/api/integrations');
    const stillPresent = removedLegacyAliasRoutes.filter((relativeRoute) =>
      existsSync(path.join(legacyRoot, relativeRoute))
    );

    expect(stillPresent).toEqual([]);
  });

  it('removes the legacy integrations handler namespace after v2 cutover', () => {
    const legacyRoot = path.join(projectRoot, 'src/app/api/integrations');
    expect(existsSync(legacyRoot)).toBe(false);
  });

  it('avoids migrated legacy integration endpoint literals in feature/shared runtime code', () => {
    const scanFiles = [...collectSourceFiles(featuresRoot), ...collectSourceFiles(sharedRoot)];
    const offenders = scanFiles
      .filter((absolute) => {
        const source = readFileSync(absolute, 'utf8');
        return migratedLegacyEndpointTokens.some((token) => source.includes(token));
      })
      .map((absolute) => path.relative(projectRoot, absolute));

    expect(offenders).toEqual([]);
  });
});
