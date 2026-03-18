'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import {
  useOptionalCmsStorefrontAppearance,
} from '@/features/cms/public';
import {
  KANGUR_BASE_PATH,
  normalizeKangurBasePath,
  normalizeKangurRequestedPath,
  resolveKangurPageKeyFromSlug,
} from '@/features/kangur/config/routing';
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurFeaturePageShell } from '@/features/kangur/ui/KangurFeaturePage';
import { KangurMainRoleProvider } from '@/features/kangur/ui/design/primitives';
import { useKangurClassOverrides } from '@/features/kangur/ui/useKangurClassOverrides';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';
import { cn } from '@/features/kangur/shared/utils';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';

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
  forceBodyScrollLock = false,
}: {
  basePath?: string;
  embedded?: boolean;
  forceBodyScrollLock?: boolean;
}): JSX.Element {
  const appearance = useOptionalCmsStorefrontAppearance();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const normalizedBasePath = normalizeKangurBasePath(basePath);
  const appearanceMode = appearance?.mode ?? 'default';
  const kangurAppearance = useKangurStorefrontAppearance();
  const classOverrides = useKangurClassOverrides();
  const routeShellClassOverride = classOverrides.components['kangur-feature-route-shell']?.['root'];
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

    const fallbackHref = baseHref.replace(/\/+$/, '') || '/';
    return withKangurClientErrorSync(
      {
        source: 'kangur-feature-route-shell',
        action: 'resolve-requested-href',
        description: 'Resolve the requested href for the Kangur route shell.',
        context: {
          baseHref,
          requestedPath,
        },
      },
      () => {
        const parsed = new URL(baseHref, 'https://kangur.local');
        const normalizedPathname = parsed.pathname.replace(/\/+$/, '') || '/';
        return search ? `${normalizedPathname}?${search}` : normalizedPathname;
      },
      { fallback: search ? `${fallbackHref}?${search}` : fallbackHref }
    );
  }, [pathname, requestedPath, searchParams]);
  const isEmbedded = embedded;
  const shellStyle: CSSProperties = {
    background: kangurAppearance.background,
    color: kangurAppearance.tone.text,
    ...kangurAppearance.vars,
  };

  return (
    <div
      className={cn(
        'relative min-h-screen min-h-[100svh] min-h-[100dvh] w-full min-w-0 overflow-x-hidden kangur-premium-bg text-slate-800',
        routeShellClassOverride
      )}
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
        <KangurMainRoleProvider suppressMainRole>
          <KangurFeaturePageShell forceBodyScrollLock={forceBodyScrollLock} />
        </KangurMainRoleProvider>
      </KangurRoutingProvider>
    </div>
  );
}
