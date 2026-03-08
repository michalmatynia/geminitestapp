import type { JSX } from 'react';

import { getKangurHomeHref, normalizeKangurBasePath } from '@/features/kangur/config/routing';
import { KangurPublicErrorBoundary } from '@/features/kangur/ui/KangurPublicErrorBoundary';
import { KangurFeaturePage } from '@/features/kangur/ui/KangurFeaturePage';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';

export function KangurPublicApp({
  slug = [],
  basePath = '/',
  embedded = false,
}: {
  slug?: string[];
  basePath?: string;
  embedded?: boolean;
}): JSX.Element {
  const normalizedBasePath = normalizeKangurBasePath(basePath);
  const homeHref = getKangurHomeHref(normalizedBasePath);

  return (
    <KangurSurfaceClassSync>
      <KangurPublicErrorBoundary homeHref={homeHref}>
        <KangurFeaturePage slug={slug} basePath={normalizedBasePath} embedded={embedded} />
      </KangurPublicErrorBoundary>
    </KangurSurfaceClassSync>
  );
}
