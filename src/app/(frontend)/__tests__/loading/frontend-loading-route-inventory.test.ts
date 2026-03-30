import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const FRONTEND_ROUTE_ROOTS = [
  path.join(process.cwd(), 'src/app/(frontend)'),
  path.join(process.cwd(), 'src/app/[locale]/(frontend)'),
];

const CMS_FRONTEND_ROUTE_DIRECTORIES = [
  '.',
  '[...slug]',
  'login',
];

const resolveMissingDedicatedLoaders = (rootDirectory: string): string[] =>
  CMS_FRONTEND_ROUTE_DIRECTORIES.filter((directory) => {
    const routeDirectory = directory === '.' ? rootDirectory : path.join(rootDirectory, directory);
    return !existsSync(path.join(routeDirectory, 'loading.tsx'));
  });

describe('cms frontend loading route inventory', () => {
  it.each(FRONTEND_ROUTE_ROOTS)(
    'ensures every explicit shared CMS frontend page under %s has a dedicated loading route',
    (rootDirectory) => {
      expect(resolveMissingDedicatedLoaders(rootDirectory)).toEqual([]);
    }
  );
});
