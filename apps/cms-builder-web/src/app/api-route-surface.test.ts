import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

const sourceRoots = [
  'src/features/cms/api',
  'src/features/cms/hooks',
  'src/features/cms/components/page-builder',
  'src/features/files/hooks/useFileQueries.ts',
  'src/features/auth/api/register.ts',
  'src/shared/api/settings-client.ts',
  'src/shared/hooks/use-settings.ts',
  'src/shared/hooks/offline/useSettingsOffline.ts',
  'src/shared/lib/observability/tanstack-telemetry.ts',
  'src/shared/utils/observability/client-error-logger.ts',
  'src/shared/utils/observability/client-error-reporter.ts',
  'src/shared/utils/observability/validation-reporter.ts',
] as const;

const routeRoot = path.join(rootDir, 'apps/cms-builder-web/src/app');
const apiPathPattern =
  /[`'"](\/api\/(?:auth|client-errors|cms|files|query-telemetry|settings)[^`'"]*)[`'"]/g;

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
  const [pathname] = rawEndpoint.split(/[?#]/);
  return pathname.replace(/\$\{[^}]+\}/g, '[id]').replace(/\/+$/g, '');
};

const routeFileForEndpoint = (endpoint: string): string => {
  if (endpoint.startsWith('/api/auth/') && endpoint !== '/api/auth/register') {
    return path.join(routeRoot, 'api/auth/[...nextauth]/route.ts');
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

describe('CMS Builder local API route surface', () => {
  it('has a local route file for each CMS Builder runtime API endpoint', () => {
    const endpoints = discoverLocalApiEndpoints();
    const missingRoutes = endpoints.filter((endpoint) => !existsSync(routeFileForEndpoint(endpoint)));

    expect(missingRoutes).toEqual([]);
  });
});
