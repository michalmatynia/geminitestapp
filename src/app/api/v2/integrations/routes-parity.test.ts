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
  'with-connections/route.ts',
  'jobs/route.ts',
  'queues/tradera/route.ts',
  'product-listings/route.ts',
  'images/sync-base/all/route.ts',
] as const;

const migratedLegacyEndpointTokens = [
  '/api/integrations/with-connections',
  '/api/integrations/jobs',
  '/api/integrations/queues/tradera',
  '/api/integrations/product-listings',
  '/api/integrations/images/sync-base/all',
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
