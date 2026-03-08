import type { JSX } from 'react';

import { getKangurHomeHref, normalizeKangurBasePath } from '@/features/kangur/config/routing';
import { KangurFeaturePage } from '@/features/kangur/ui/KangurFeaturePage';
import { KangurLoginPage } from '@/features/kangur/ui/KangurLoginPage';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';

export function KangurPublicApp({
  slug = [],
  basePath = '/',
}: {
  slug?: string[];
  basePath?: string;
}): JSX.Element {
  const normalizedBasePath = normalizeKangurBasePath(basePath);
  const homeHref = getKangurHomeHref(normalizedBasePath);

  return (
    <KangurSurfaceClassSync>
      {slug.length === 1 && slug[0]?.trim().toLowerCase() === 'login' ? (
        <KangurLoginPage defaultCallbackUrl={homeHref} backHref={homeHref} />
      ) : (
        <KangurFeaturePage slug={slug} basePath={normalizedBasePath} />
      )}
    </KangurSurfaceClassSync>
  );
}
