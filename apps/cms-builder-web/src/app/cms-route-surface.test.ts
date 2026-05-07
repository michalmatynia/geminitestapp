import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const rootCmsRouteDir = path.join(rootDir, 'src/app/(admin)/admin/cms');
const workspaceCmsRouteDir = path.join(rootDir, 'apps/cms-builder-web/src/app/admin/cms');
const workspaceAppDir = path.join(rootDir, 'apps/cms-builder-web/src/app');
const routeFileNames = new Set(['page.tsx', 'loading.tsx', 'layout.tsx', 'error.tsx', 'not-found.tsx']);

const listRouteFiles = (baseDir: string, currentDir = baseDir): string[] =>
  readdirSync(currentDir, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) return listRouteFiles(baseDir, absolutePath);
    if (!routeFileNames.has(entry.name)) return [];
    return [path.relative(baseDir, absolutePath)];
  });

describe('CMS Builder page route surface', () => {
  it('contains every CMS admin route file exposed by the root app', () => {
    expect(statSync(rootCmsRouteDir).isDirectory()).toBe(true);
    expect(statSync(workspaceCmsRouteDir).isDirectory()).toBe(true);

    const rootRoutes = listRouteFiles(rootCmsRouteDir).sort();
    const workspaceRoutes = new Set(listRouteFiles(workspaceCmsRouteDir));
    const missingRoutes = rootRoutes.filter((route) => !workspaceRoutes.has(route));

    expect(missingRoutes).toEqual([]);
  });

  it('contains the public CMS storefront routes for the standalone deployment', () => {
    const publicRouteFiles = [
      'page.tsx',
      '[...slug]/page.tsx',
      '[locale]/layout.tsx',
      '[locale]/page.tsx',
      '[locale]/[...slug]/page.tsx',
      'not-found.tsx',
    ];

    const missingRoutes = publicRouteFiles.filter(
      (route) => !existsSync(path.join(workspaceAppDir, route))
    );

    expect(missingRoutes).toEqual([]);
  });

  it('keeps standalone public CMS routing independent of the root front-page owner', () => {
    const publicRoutesSource = readFileSync(
      path.join(workspaceAppDir, '_public/cms-public-routes.tsx'),
      'utf8'
    );

    expect(publicRoutesSource).not.toContain('resolveFrontPageSelection');
    expect(publicRoutesSource).not.toContain('requireAccessibleKangurSlugRoute');
  });
});
