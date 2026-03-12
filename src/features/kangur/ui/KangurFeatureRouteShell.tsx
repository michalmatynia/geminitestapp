'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import {
  useOptionalCmsStorefrontAppearance,
} from '@/features/cms/components/frontend/CmsStorefrontAppearance';
import {
  KANGUR_BASE_PATH,
  normalizeKangurBasePath,
  normalizeKangurRequestedPath,
  resolveKangurPageKeyFromSlug,
} from '@/features/kangur/config/routing';
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurFeaturePageShell } from '@/features/kangur/ui/KangurFeaturePage';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';

import type { CSSProperties, JSX } from 'react';

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
  const appearance = useOptionalCmsStorefrontAppearance();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const normalizedBasePath = normalizeKangurBasePath(basePath);
  const appearanceMode = appearance?.mode ?? 'default';
  const kangurAppearance = useKangurStorefrontAppearance();
  const slug = useMemo(
    () => getSlugFromPathname(pathname, normalizedBasePath),
    [normalizedBasePath, pathname]
  );
  const activeSlug = slug[0] ?? null;
  const effectiveSlug = activeSlug?.trim().toLowerCase() === 'login' ? [] : slug;
  const pageKey = resolveKangurPageKeyFromSlug(activeSlug);
  const requestedPath = normalizeKangurRequestedPath(effectiveSlug, normalizedBasePath);
  const requestedHref = useMemo(() => {
    const search = searchParams?.toString() || '';
    const baseHref = pathname || requestedPath;

    try {
      const parsed = new URL(baseHref, 'https://kangur.local');
      const normalizedPathname = parsed.pathname.replace(/\/+$/, '') || '/';
      return search ? `${normalizedPathname}?${search}` : normalizedPathname;
    } catch {
      const normalizedHref = baseHref.replace(/\/+$/, '') || '/';
      return search ? `${normalizedHref}?${search}` : normalizedHref;
    }
  }, [pathname, requestedPath, searchParams]);
  const isEmbedded = embedded;
  const shellStyle: CSSProperties = {
    background: kangurAppearance.background,
    color: kangurAppearance.tone.text,
    ...kangurAppearance.vars,
  };

  return (
    <div
      className='relative min-h-screen w-full kangur-premium-bg text-slate-800'
      data-appearance-mode={appearanceMode}
      data-kangur-appearance={appearanceMode}
      data-testid='kangur-route-shell'
      style={shellStyle}
    >
      <KangurRoutingProvider
        pageKey={pageKey}
        requestedPath={requestedPath}
        requestedHref={requestedHref}
        basePath={normalizedBasePath}
        embedded={isEmbedded}
      >
        <KangurFeaturePageShell />
      </KangurRoutingProvider>
    </div>
  );
}
