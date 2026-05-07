import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const routeRoot = path.join(rootDir, 'apps/database-engine-web/src/app');

const sourceRoots = [
  'src/features/database/api',
  'src/features/database/components',
  'src/features/database/context',
  'src/features/database/hooks',
  'src/features/database/pages',
  'src/features/auth/pages/public',
  'src/shared/api/settings-client.ts',
] as const;

const apiPathPattern =
  /[`'"](\/api\/(?:auth|client-errors|databases|query-telemetry|settings)[^`'"]*)[`'"]/g;

const requiredPageRoutes = [
  'page.tsx',
  'admin/page.tsx',
  'admin/databases/page.tsx',
  'admin/databases/control-panel/page.tsx',
  'admin/databases/engine/page.tsx',
  'admin/databases/preview/page.tsx',
  'admin/databases/backups/page.tsx',
  'admin/databases/crud/page.tsx',
  'admin/databases/operations/page.tsx',
  'auth/signin/page.tsx',
  'auth/register/page.tsx',
] as const;

const requiredApiRoutes = [
  'api/settings/database/sync/route.ts',
] as const;

const listSourceFiles = (relativePath: string): string[] => {
  const absolutePath = path.join(rootDir, relativePath);
  const stat = statSync(absolutePath);
  if (stat.isFile()) return [absolutePath];

  return readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    const childRelativePath = path.join(relativePath, entry.name);
    if (entry.isDirectory()) return listSourceFiles(childRelativePath);
    return /\.(ts|tsx)$/.test(entry.name) ? [path.join(rootDir, childRelativePath)] : [];
  });
};

const normalizeEndpoint = (rawEndpoint: string): string => {
  const pathname = rawEndpoint.split(/[?#]/)[0] ?? '';
  return pathname.replace(/\$\{[^}]+\}/g, '[id]').replace(/\/+$/g, '');
};

const routeFileForEndpoint = (endpoint: string): string => {
  if (endpoint.startsWith('/api/auth/') && endpoint !== '/api/auth/register') {
    return path.join(routeRoot, 'api/auth/[...nextauth]/route.ts');
  }

  if (
    endpoint.startsWith('/api/databases/') &&
    endpoint !== '/api/databases/engine/source' &&
    endpoint !== '/api/databases/engine/source/sync'
  ) {
    return path.join(routeRoot, 'api/databases/[[...path]]/route.ts');
  }

  return path.join(routeRoot, endpoint.slice(1), 'route.ts');
};

const discoverLocalApiEndpoints = (): string[] => {
  const endpoints = new Set<string>();

  for (const sourceFile of sourceRoots.flatMap(listSourceFiles)) {
    const source = readFileSync(sourceFile, 'utf8');
    for (const match of source.matchAll(apiPathPattern)) {
      const endpoint = normalizeEndpoint(match[1] ?? '');
      if (endpoint.length > 0) endpoints.add(endpoint);
    }
  }

  return [...endpoints].sort();
};

const listWorkspaceApiRouteFiles = (): string[] =>
  listSourceFiles('apps/database-engine-web/src/app/api').filter((file) => file.endsWith('route.ts'));

describe('Database Engine workspace route surface', () => {
  it('keeps root app database UI and API compatibility routes pruned', () => {
    expect(existsSync(path.join(rootDir, 'src/app/(admin)/admin/databases'))).toBe(false);
    expect(existsSync(path.join(rootDir, 'src/app/api/databases'))).toBe(false);
  });

  it('contains the standalone page routes', () => {
    const missingRoutes = requiredPageRoutes.filter((route) => !existsSync(path.join(routeRoot, route)));

    expect(missingRoutes).toEqual([]);
  });

  it('contains required settings API routes for database flows', () => {
    const missingRoutes = requiredApiRoutes.filter((route) => !existsSync(path.join(routeRoot, route)));

    expect(missingRoutes).toEqual([]);
  });

  it('owns the local databases catch-all API route layer', () => {
    const source = readFileSync(path.join(routeRoot, 'api/databases/[[...path]]/route.ts'), 'utf8');

    expect(source).toContain('database-engine-web.databases.[[...path]].GET');
    expect(source).not.toContain('@/app/api/databases');
  });

  it('does not import root app route files from local API routes', () => {
    const rootRouteImports = listWorkspaceApiRouteFiles().flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return /@\/app\/api\/.*\/route['"]/.test(source) ? [path.relative(routeRoot, file)] : [];
    });

    expect(rootRouteImports).toEqual([]);
  });

  it('has a local route file for each Database Engine runtime API endpoint', () => {
    const endpoints = discoverLocalApiEndpoints();
    const missingRoutes = endpoints.filter((endpoint) => !existsSync(routeFileForEndpoint(endpoint)));

    expect(missingRoutes).toEqual([]);
  });
});
