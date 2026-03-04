import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '../../../../../../..');

const legacyRoot = path.join(projectRoot, 'src/app/api/integrations/imports/base');
const v2Root = path.join(projectRoot, 'src/app/api/v2/integrations/imports/base');
const featuresRoot = path.join(projectRoot, 'src/features');
const importExportFeatureRoot = path.join(featuresRoot, 'data-import-export');
const legacyEndpointToken = '/api/integrations/imports/base';
const legacyCsvImportEndpointToken = '/api/import';
const legacyCatalogsEndpointToken = '/api/catalogs';
const legacyContractsImportToken = '@/shared/contracts/data-import-export';
const legacyApiImportToken = "@/app/api/integrations/imports/base/";
const legacyExportWarehouseEndpointToken = '/api/v2/integrations/imports/base/export-warehouse';
const canonicalImportsRootEndpointToken = '/api/v2/integrations/imports/base';
const legacyRootImportActionPattern = /action\s*:\s*['"]import['"]/;
const expectedV2RoutePaths = [
  'route.ts',
  'parameters/route.ts',
  'sample-product/route.ts',
  '[setting]/route.ts',
  'runs/route.ts',
  'runs/[runId]/route.ts',
  'runs/[runId]/resume/route.ts',
  'runs/[runId]/cancel/route.ts',
  'runs/[runId]/report/route.ts',
] as const;

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

describe('v2 integrations imports/base route migration', () => {
  it('keeps expected /api/v2/integrations/imports/base route.ts files present', () => {
    const v2Routes = new Set(collectRouteFiles(v2Root));
    const missing = expectedV2RoutePaths.filter((relativeRoute) => !v2Routes.has(relativeRoute));
    expect(missing).toEqual([]);
  });

  it('removes legacy /api/integrations/imports/base route.ts files', () => {
    const legacyRoutes = collectRouteFiles(legacyRoot);
    expect(legacyRoutes).toEqual([]);
  });

  it('keeps v2 route.ts files independent from legacy api namespace imports', () => {
    const v2Routes = collectRouteFiles(v2Root);
    const offenders = v2Routes.filter((relativeRoute) =>
      readFileSync(path.join(v2Root, relativeRoute), 'utf8').includes(legacyApiImportToken)
    );

    expect(offenders).toEqual([]);
  });

  it('avoids legacy imports/base endpoint literals in feature runtime code', () => {
    const featureFiles = collectSourceFiles(featuresRoot);
    const offenders = featureFiles
      .filter((absolute) => readFileSync(absolute, 'utf8').includes(legacyEndpointToken))
      .map((absolute) => path.relative(projectRoot, absolute));

    expect(offenders).toEqual([]);
  });

  it('avoids legacy CSV import endpoint literals in feature runtime code', () => {
    const featureFiles = collectSourceFiles(featuresRoot);
    const offenders = featureFiles
      .filter((absolute) => readFileSync(absolute, 'utf8').includes(legacyCsvImportEndpointToken))
      .map((absolute) => path.relative(projectRoot, absolute));

    expect(offenders).toEqual([]);
  });

  it('avoids legacy catalogs endpoint literals in feature runtime code', () => {
    const featureFiles = collectSourceFiles(importExportFeatureRoot);
    const offenders = featureFiles
      .filter((absolute) => readFileSync(absolute, 'utf8').includes(legacyCatalogsEndpointToken))
      .map((absolute) => path.relative(projectRoot, absolute));

    expect(offenders).toEqual([]);
  });

  it('avoids direct legacy data-import-export contract imports in feature runtime code', () => {
    const featureFiles = collectSourceFiles(featuresRoot);
    const offenders = featureFiles
      .filter((absolute) => readFileSync(absolute, 'utf8').includes(legacyContractsImportToken))
      .map((absolute) => path.relative(projectRoot, absolute));

    expect(offenders).toEqual([]);
  });

  it('avoids deprecated imports/base export-warehouse endpoint literals in feature runtime code', () => {
    const featureFiles = collectSourceFiles(featuresRoot);
    const offenders = featureFiles
      .filter((absolute) =>
        readFileSync(absolute, 'utf8').includes(legacyExportWarehouseEndpointToken)
      )
      .map((absolute) => path.relative(projectRoot, absolute));

    expect(offenders).toEqual([]);
  });

  it('avoids legacy root imports action=import payloads in feature runtime code', () => {
    const featureFiles = collectSourceFiles(featuresRoot);
    const offenders = featureFiles
      .filter((absolute) => {
        const content = readFileSync(absolute, 'utf8');
        return (
          content.includes(canonicalImportsRootEndpointToken) &&
          legacyRootImportActionPattern.test(content)
        );
      })
      .map((absolute) => path.relative(projectRoot, absolute));

    expect(offenders).toEqual([]);
  });
});
