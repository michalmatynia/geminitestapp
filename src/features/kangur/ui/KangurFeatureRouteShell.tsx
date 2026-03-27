'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import { useOptionalCmsStorefrontAppearance } from '@/features/cms/public';
import {
  KANGUR_BASE_PATH,
  normalizeKangurBasePath,
  normalizeKangurRequestedPath,
  resolveKangurPageKeyFromSlug,
} from '@/features/kangur/config/routing';
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurFeaturePageShell } from '@/features/kangur/ui/KangurFeaturePage';
import { KangurMainRoleProvider } from '@/features/kangur/ui/design/primitives/KangurPageContainer';
import {
  getKangurSlugFromPathname,
} from '@/features/kangur/ui/routing/managed-paths';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';
import { cn } from '@/features/kangur/shared/utils';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';

import type { CSSProperties, JSX } from 'react';

const KANGUR_CLIENT_SHELL_ACTIVE_CLASSNAME = 'kangur-client-shell-active';

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
  const browserPathname =
    typeof window === 'undefined' ? null : window.location.pathname?.trim() || null;
  const browserSearch = typeof window === 'undefined' ? '' : window.location.search || '';
  const resolvedPathname = pathname?.trim() || browserPathname || normalizedBasePath;
  const slug = useMemo(
    () => getKangurSlugFromPathname(resolvedPathname, normalizedBasePath),
    [normalizedBasePath, resolvedPathname]
  );
  const activeSlug = slug[0] ?? null;
  const effectiveSlug = activeSlug?.trim().toLowerCase() === 'login' ? [] : slug;
  const pageKey = resolveKangurPageKeyFromSlug(activeSlug);
  const requestedPath = normalizeKangurRequestedPath(effectiveSlug, normalizedBasePath);
  const requestedHref = useMemo(() => {
    const search = searchParams?.toString() || browserSearch.replace(/^\?/, '');
    const baseHref = resolvedPathname || requestedPath;

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
  }, [browserSearch, requestedPath, resolvedPathname, searchParams]);
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.classList.add(KANGUR_CLIENT_SHELL_ACTIVE_CLASSNAME);
    document.body.classList.add(KANGUR_CLIENT_SHELL_ACTIVE_CLASSNAME);

    return () => {
      document.documentElement.classList.remove(KANGUR_CLIENT_SHELL_ACTIVE_CLASSNAME);
      document.body.classList.remove(KANGUR_CLIENT_SHELL_ACTIVE_CLASSNAME);
    };
  }, []);

  const isEmbedded = embedded;
  const shellStyle: CSSProperties & Record<string, string> = {
    ...kangurAppearance.vars,
  };

  return (
    <div
      className={cn(
        'relative w-full min-w-0 overflow-x-hidden kangur-premium-bg kangur-shell-viewport-height'
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
