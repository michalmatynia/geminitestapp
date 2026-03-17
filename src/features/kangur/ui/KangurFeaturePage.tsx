'use client';

import { useEffect, useMemo, useRef } from 'react';

import {
  useOptionalCmsStorefrontAppearance,
} from '@/features/cms/public';
import {
  KANGUR_BASE_PATH,
  resolveKangurFeaturePageRoute,
} from '@/features/kangur/config/routing';
import {
  clearKangurClientObservabilityContext,
  setKangurClientObservabilityContext,
} from '@/features/kangur/observability/client';
import {
  KangurRoutingProvider,
  useKangurRoutingState,
} from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurFeatureApp } from '@/features/kangur/ui/KangurFeatureApp';
import { useKangurClassOverrides } from '@/features/kangur/ui/useKangurClassOverrides';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';
import {
  buildKangurScopedCustomCss,
  resolveKangurCustomCssScopeSelector,
} from '@/features/kangur/utils/custom-css';
import { isKangurThemeDebugEnabled } from '@/features/kangur/utils/theme-debug';
import { cn } from '@/features/kangur/shared/utils';

import type { CSSProperties, JSX } from 'react';

type KangurFeaturePageProps = {
  slug?: string[];
  basePath?: string;
  embedded?: boolean;
};

export function KangurFeaturePageShell(): JSX.Element {
  const appearance = useOptionalCmsStorefrontAppearance();
  const { embedded, pageKey, requestedPath } = useKangurRoutingState();
  const appearanceMode = appearance?.mode ?? 'default';
  const kangurAppearance = useKangurStorefrontAppearance();
  const classOverrides = useKangurClassOverrides();
  const shellClassOverride = cn(
    classOverrides.globals.shell,
    classOverrides.components['kangur-feature-page-shell']?.['root']
  );
  const customCssSelectors = kangurAppearance.theme?.customCssSelectors ?? '';
  const customCssScope = useMemo(
    () => resolveKangurCustomCssScopeSelector(customCssSelectors),
    [customCssSelectors]
  );
  const customCss = buildKangurScopedCustomCss(
    kangurAppearance.theme?.customCss,
    customCssSelectors
  );
  const debugRef = useRef<string | null>(null);
  const shellStyle: CSSProperties = {
    background: kangurAppearance.background,
    color: kangurAppearance.tone.text,
    ...kangurAppearance.vars,
  };

  useEffect(() => {
    if (!isKangurThemeDebugEnabled()) return;
    const payload = {
      mode: appearanceMode,
      customCssScope,
      customCssSelectors: customCssSelectors || null,
      hasCustomCss: Boolean(customCss),
    };
    const signature = JSON.stringify(payload);
    if (debugRef.current === signature) return;
    debugRef.current = signature;
    console.info('[KangurThemeDebug]', payload);
  }, [appearanceMode, customCss, customCssScope, customCssSelectors]);

  useEffect(() => {
    setKangurClientObservabilityContext({
      pageKey: pageKey ?? null,
      requestedPath: requestedPath ?? '',
    });
    return () => {
      clearKangurClientObservabilityContext();
    };
  }, [pageKey, requestedPath]);

  return (
    <div
      className={cn(
        'relative w-full kangur-premium-bg text-slate-800',
        embedded ? 'min-h-full' : 'min-h-screen min-h-[100svh] min-h-[100dvh]',
        shellClassOverride
      )}
      data-appearance-mode={appearanceMode}
      data-kangur-appearance={appearanceMode}
      data-testid='kangur-feature-page-shell'
      lang='pl'
      style={shellStyle}
    >
      {customCss ? <style data-kangur-custom-css>{customCss}</style> : null}
      <KangurFeatureApp />
      <footer className='w-full border-t border-white/10 px-4 py-6 text-center text-xs [color:var(--kangur-page-muted-text)] sm:px-6'>
        <span>Creator credentials: Michał Matynia · created 2026 · </span>
        <a
          className='font-semibold [color:var(--kangur-page-text)] hover:underline'
          href='mailto:mmatynia@gmail.com'
        >
          contact: mmatynia@gmail.com
        </a>
      </footer>
    </div>
  );
}

export function KangurFeaturePage({
  slug = [],
  basePath = KANGUR_BASE_PATH,
  embedded = false,
}: KangurFeaturePageProps): JSX.Element {
  const { normalizedBasePath, pageKey, requestedPath } = resolveKangurFeaturePageRoute(
    slug,
    basePath
  );
  const isEmbedded = embedded;

  return (
    <KangurRoutingProvider
      pageKey={pageKey}
      requestedPath={requestedPath}
      requestedHref={requestedPath}
      basePath={normalizedBasePath}
      embedded={isEmbedded}
    >
      <KangurFeaturePageShell />
    </KangurRoutingProvider>
  );
}
