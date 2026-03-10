'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import {
  KANGUR_BASE_PATH,
  normalizeKangurBasePath,
  normalizeKangurRequestedPath,
  resolveKangurPageKeyFromSlug,
} from '@/features/kangur/config/routing';
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurFeaturePageShell } from '@/features/kangur/ui/KangurFeaturePage';

import type { JSX } from 'react';

const getSlugFromPathname = (
  pathname: string | null,
  normalizedBasePath: string
): string[] => {
  const resolvedPathname = pathname?.trim() || normalizedBasePath;
  const withoutQuery = resolvedPathname.split('?')[0] ?? resolvedPathname;
  const normalizedPathname = withoutQuery.replace(/\/+$/, '') || '/';

  if (normalizedBasePath === '/') {
    return normalizedPathname
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);
  }

  if (
    normalizedPathname === normalizedBasePath ||
    normalizedPathname === `${normalizedBasePath}/`
  ) {
    return [];
  }

  if (!normalizedPathname.startsWith(`${normalizedBasePath}/`)) {
    return [];
  }

  return normalizedPathname
    .slice(normalizedBasePath.length + 1)
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
};

export function KangurFeatureRouteShell({
  basePath = KANGUR_BASE_PATH,
  embedded = false,
}: {
  basePath?: string;
  embedded?: boolean;
}): JSX.Element {
  const pathname = usePathname();
  const normalizedBasePath = normalizeKangurBasePath(basePath);
  const slug = useMemo(
    () => getSlugFromPathname(pathname, normalizedBasePath),
    [normalizedBasePath, pathname]
  );
  const activeSlug = slug[0] ?? null;
  const effectiveSlug = activeSlug?.trim().toLowerCase() === 'login' ? [] : slug;
  const pageKey = resolveKangurPageKeyFromSlug(activeSlug);
  const requestedPath = normalizeKangurRequestedPath(effectiveSlug, normalizedBasePath);

  return (
    <div
      className='relative min-h-screen w-full kangur-premium-bg text-slate-800'
      data-testid='kangur-route-shell'
    >
      <KangurRoutingProvider
        pageKey={pageKey}
        requestedPath={requestedPath}
        basePath={normalizedBasePath}
        embedded={embedded}
      >
        <KangurFeaturePageShell />
      </KangurRoutingProvider>
    </div>
  );
}
