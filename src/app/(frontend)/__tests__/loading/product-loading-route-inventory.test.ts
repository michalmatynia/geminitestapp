import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const PRODUCT_FRONTEND_ROUTE_ROOTS = [
  path.join(process.cwd(), 'src/app/(frontend)', 'products'),
  path.join(process.cwd(), 'src/app/[locale]/(frontend)', 'products'),
];

const PRODUCT_PUBLIC_ROUTE_DIRECTORIES = [path.join('[id]')];

const resolveMissingDedicatedLoaders = (rootDirectory: string): string[] =>
  PRODUCT_PUBLIC_ROUTE_DIRECTORIES.filter((directory) => {
    const routeDirectory = path.join(rootDirectory, directory);
    return !existsSync(path.join(routeDirectory, 'loading.tsx'));
  });

describe('product frontend loading route inventory', () => {
  it.each(PRODUCT_FRONTEND_ROUTE_ROOTS)(
    'ensures every explicit public product page under %s has a dedicated loading route',
    (rootDirectory) => {
      expect(resolveMissingDedicatedLoaders(rootDirectory)).toEqual([]);
    }
  );
});
