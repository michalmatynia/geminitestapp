import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const routeRoot = path.join(rootDir, 'apps/database-engine-web/src/app');

const sourceRoots = [
  'apps/database-engine-web/src/features/database/api',
  'apps/database-engine-web/src/features/database/components',
  'apps/database-engine-web/src/features/database/context',
  'apps/database-engine-web/src/features/database/hooks',
  'apps/database-engine-web/src/features/database/pages',
  'apps/database-engine-web/src/auth/pages/public',
  'src/shared/api/settings-client.ts',
] as const;

const apiPathPattern =
  /[`'"](\/api\/(?:auth|client-errors|databases|query-telemetry|settings)[^`'"]*)[`'"]/g;
const rootAppAlias = ['@', 'app'].join('/');
const rootAppApiAlias = ['@', 'app', 'api'].join('/');
const rootJobsFeatureAlias = ['@', 'features', 'jobs'].join('/');
const rootKangurFeatureAlias = ['@', 'features', 'kangur'].join('/');
const staleDatabaseSourcePattern = new RegExp(String.raw`\b(?:source|logPrefix): ['"]databases\.`);

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

  if (endpoint.startsWith('/api/databases/')) {
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

const listDatabaseApiRouteFiles = (): string[] =>
  listSourceFiles('apps/database-engine-web/src/app/api/databases').filter((file) =>
    file.endsWith(`${path.sep}route.ts`)
  );

const listFeatureApiRouteWrapperFiles = (): string[] =>
  listSourceFiles('apps/database-engine-web/src/features/database/server/api').filter((file) =>
    file.endsWith(`${path.sep}route.ts`)
  );

const listWorkspaceSourceFiles = (): string[] => listSourceFiles('apps/database-engine-web/src');

describe('Database Engine workspace route surface', () => {
  it('keeps root app database UI and API compatibility routes pruned', () => {
    expect(existsSync(path.join(rootDir, 'src/app/(admin)/admin/databases'))).toBe(false);
    expect(existsSync(path.join(rootDir, 'src/app/api/databases'))).toBe(false);
    expect(existsSync(path.join(rootDir, 'src/features/database'))).toBe(false);
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
    expect(source).not.toContain(`${rootAppApiAlias}/databases`);
  });

  it('routes Database Engine database APIs through one local catch-all route file', () => {
    const databaseRouteFiles = listDatabaseApiRouteFiles().map((file) =>
      path.relative(routeRoot, file)
    );

    expect(databaseRouteFiles).toEqual(['api/databases/[[...path]]/route.ts']);
  });

  it('does not import root app API modules from local API routes', () => {
    const rootApiImports = listWorkspaceApiRouteFiles().flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return source.includes(rootAppApiAlias) ? [path.relative(routeRoot, file)] : [];
    });

    expect(rootApiImports).toEqual([]);
  });

  it('keeps feature API modules as route handlers instead of Next route wrappers', () => {
    const featureRouteWrappers = listFeatureApiRouteWrapperFiles().map((file) =>
      path.relative(rootDir, file)
    );

    expect(featureRouteWrappers).toEqual([]);
  });

  it('names Database Engine API sources with the standalone app prefix', () => {
    const staleSources = listWorkspaceSourceFiles().flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return staleDatabaseSourcePattern.test(source) ? [path.relative(rootDir, file)] : [];
    });

    expect(staleSources).toEqual([]);
  });

  it('does not import root app modules from standalone workspace source', () => {
    const rootAppImports = listWorkspaceSourceFiles().flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return source.includes(rootAppAlias) ? [path.relative(rootDir, file)] : [];
    });

    expect(rootAppImports).toEqual([]);
  });

  it('does not import non-database feature modules from standalone workspace source', () => {
    const externalFeatureImports = listWorkspaceSourceFiles().flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const matches = source.match(/@\/features\/(?!database(?:['/]))[A-Za-z0-9_-]+/g) ?? [];
      return matches.length > 0
        ? [`${path.relative(rootDir, file)}: ${matches.join(', ')}`]
        : [];
    });

    expect(externalFeatureImports).toEqual([]);
  });

  it('does not expose the root app alias in standalone build config', () => {
    const tsconfig = readFileSync(path.join(rootDir, 'apps/database-engine-web/tsconfig.json'), 'utf8');
    const nextConfig = readFileSync(path.join(rootDir, 'apps/database-engine-web/next.config.mjs'), 'utf8');

    expect(tsconfig).not.toContain(`"${rootAppAlias}/*"`);
    expect(nextConfig).not.toContain(`'${rootAppAlias}'`);
    expect(nextConfig).not.toContain(`"${rootAppAlias}"`);
    expect(tsconfig).not.toContain('"@/server/*"');
    expect(tsconfig).not.toContain('"@/i18n/*"');
    expect(tsconfig).not.toContain('"@docs/*"');
    expect(nextConfig).not.toContain("'@/server'");
    expect(nextConfig).not.toContain("'@/i18n'");
    expect(nextConfig).not.toContain("'@docs'");
  });

  it('maps Database Engine feature imports to the standalone workspace implementation', () => {
    const tsconfig = readFileSync(path.join(rootDir, 'apps/database-engine-web/tsconfig.json'), 'utf8');
    const nextConfig = readFileSync(path.join(rootDir, 'apps/database-engine-web/next.config.mjs'), 'utf8');

    expect(tsconfig).toContain('"@/features/database/*": ["src/features/database/*"]');
    expect(nextConfig).toContain("path.resolve(__dirname, 'src/features/database')");
  });

  it('keeps Database Engine Vitest compatibility local to the standalone workspace', () => {
    const rootVitestConfig = readFileSync(path.join(rootDir, 'vitest.config.ts'), 'utf8');
    const workspaceVitestConfig = readFileSync(
      path.join(rootDir, 'apps/database-engine-web/vitest.config.ts'),
      'utf8'
    );
    const workspacePackage = readFileSync(
      path.join(rootDir, 'apps/database-engine-web/package.json'),
      'utf8'
    );

    expect(rootVitestConfig).not.toContain('./apps/database-engine-web/src/features/database');
    expect(workspaceVitestConfig).toContain("path.resolve(appDir, 'src/features/database')");
    expect(workspaceVitestConfig).not.toContain("'@':");
    expect(workspaceVitestConfig).not.toContain("'@/server'");
    expect(workspaceVitestConfig).not.toContain("'@/i18n'");
    expect(workspaceVitestConfig).not.toContain("'@docs'");
    expect(workspacePackage).toContain('vitest --config vitest.config.ts run');
  });

  it('uses local Database Engine instrumentation instead of root startup bootstrap', () => {
    const instrumentation = readFileSync(
      path.join(rootDir, 'apps/database-engine-web/src/instrumentation.ts'),
      'utf8'
    );
    const nodeInstrumentation = readFileSync(
      path.join(rootDir, 'apps/database-engine-web/src/instrumentation.node.ts'),
      'utf8'
    );

    expect(instrumentation).toContain('registerDatabaseEngineNodeInstrumentation');
    expect(nodeInstrumentation).not.toContain(rootJobsFeatureAlias);
    expect(nodeInstrumentation).not.toContain(rootKangurFeatureAlias);
    expect(nodeInstrumentation).not.toContain('@/shared/server/api/settings/lite/handler');
  });

  it('has a local route file for each Database Engine runtime API endpoint', () => {
    const endpoints = discoverLocalApiEndpoints();
    const missingRoutes = endpoints.filter((endpoint) => !existsSync(routeFileForEndpoint(endpoint)));

    expect(missingRoutes).toEqual([]);
  });
});
