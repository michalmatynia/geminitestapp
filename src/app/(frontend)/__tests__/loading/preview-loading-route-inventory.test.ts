import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const PREVIEW_FRONTEND_ROUTE_ROOTS = [
  path.join(process.cwd(), 'src/app/(frontend)'),
  path.join(process.cwd(), 'src/app/[locale]/(frontend)'),
];

const PREVIEW_FRONTEND_ROUTE_DIRECTORIES = [
  path.join('preview', '[id]'),
  path.join('preview', 'foldertree-shell-runtime'),
];

const resolveMissingDedicatedLoaders = (rootDirectory: string): string[] =>
  PREVIEW_FRONTEND_ROUTE_DIRECTORIES.filter((directory) => {
    const routeDirectory = path.join(rootDirectory, directory);
    return !existsSync(path.join(routeDirectory, 'loading.tsx'));
  });

describe('preview frontend loading route inventory', () => {
  it.each(PREVIEW_FRONTEND_ROUTE_ROOTS)(
    'ensures every explicit preview frontend page under %s has a dedicated loading route',
    (rootDirectory) => {
      expect(resolveMissingDedicatedLoaders(rootDirectory)).toEqual([]);
    }
  );
});
