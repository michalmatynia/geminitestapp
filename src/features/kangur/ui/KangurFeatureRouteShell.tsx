'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

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
  KANGUR_TOP_BAR_DEFAULT_HEIGHT_PX,
  KANGUR_TOP_BAR_HEIGHT_VAR_NAME,
} from '@/features/kangur/ui/design/tokens';
import {
  getKangurSlugFromPathname,
} from '@/features/kangur/ui/routing/managed-paths';
import { readKangurTopBarHeightCssValue } from '@/features/kangur/ui/utils/readKangurTopBarHeightCssValue';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';
import { cn } from '@/features/kangur/shared/utils';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';

import type { CSSProperties, JSX } from 'react';

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
  const slug = useMemo(
    () => getKangurSlugFromPathname(pathname, normalizedBasePath),
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
  const initialTopBarHeightCssValue =
    readKangurTopBarHeightCssValue() ?? `${KANGUR_TOP_BAR_DEFAULT_HEIGHT_PX}px`;
  const shellStyle: CSSProperties = {
    background: kangurAppearance.background,
    color: kangurAppearance.tone.text,
    [KANGUR_TOP_BAR_HEIGHT_VAR_NAME]: initialTopBarHeightCssValue,
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
