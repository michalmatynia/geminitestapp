'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  useOptionalCmsStorefrontAppearance,
} from '@/features/cms/public';
import {
  KANGUR_BASE_PATH,
  getKangurPageHref,
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
import { KANGUR_MAIN_CONTENT_ID } from '@/features/kangur/ui/design/primitives/KangurPageContainer';
import { useKangurClassOverrides } from '@/features/kangur/ui/useKangurClassOverrides';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';
import {
  buildKangurScopedCustomCss,
  resolveKangurCustomCssScopeSelector,
} from '@/features/kangur/utils/custom-css';
import { isKangurThemeDebugEnabled } from '@/features/kangur/utils/theme-debug';
import { cn } from '@/features/kangur/shared/utils';
import { KangurAccessibilityPanel } from '@/features/kangur/ui/components/KangurAccessibilityPanel';

import type { CSSProperties, JSX, KeyboardEvent } from 'react';

type KangurFeaturePageProps = {
  slug?: string[];
  basePath?: string;
  embedded?: boolean;
};

export function KangurFeaturePageShell(): JSX.Element {
  const appearance = useOptionalCmsStorefrontAppearance();
  const { embedded, pageKey, requestedPath, basePath } = useKangurRoutingState();
  const appearanceMode = appearance?.mode ?? 'default';
  const kangurAppearance = useKangurStorefrontAppearance();
  const classOverrides = useKangurClassOverrides();
  const customCssEnabled = useMemo(() => {
    const raw = process.env['NEXT_PUBLIC_KANGUR_CUSTOM_CSS_ENABLED'];
    if (process.env['NODE_ENV'] !== 'production') {
      return raw !== 'false';
    }
    return raw === 'true';
  }, []);
  const shellClassOverride = cn(
    classOverrides.globals.shell,
    classOverrides.components['kangur-feature-page-shell']?.['root']
  );
  const customCssSelectors = customCssEnabled
    ? (kangurAppearance.theme?.customCssSelectors ?? '')
    : '';
  const customCssScope = useMemo(
    () => resolveKangurCustomCssScopeSelector(customCssSelectors),
    [customCssSelectors]
  );
  const customCss = customCssEnabled
    ? buildKangurScopedCustomCss(kangurAppearance.theme?.customCss, customCssSelectors)
    : '';
  const debugRef = useRef<string | null>(null);
  const focusSkipTarget = useCallback((event: { preventDefault: () => void }): void => {
    if (typeof document === 'undefined') return;
    const target = document.getElementById(KANGUR_MAIN_CONTENT_ID);
    if (!(target instanceof HTMLElement)) return;
    event.preventDefault();
    window.location.hash = KANGUR_MAIN_CONTENT_ID;
    target.focus();
  }, []);
  const handleSkipKeyDown = useCallback(
    (event: KeyboardEvent<HTMLAnchorElement>): void => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.stopPropagation();
      focusSkipTarget(event);
    },
    [focusSkipTarget]
  );
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
      customCssEnabled,
    };
    const signature = JSON.stringify(payload);
    if (debugRef.current === signature) return;
    debugRef.current = signature;
    console.info('[KangurThemeDebug]', payload);
  }, [appearanceMode, customCss, customCssEnabled, customCssScope, customCssSelectors]);

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
        'relative flex w-full min-w-0 flex-col overflow-x-hidden kangur-premium-bg text-slate-800',
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
      <a
        href={`#${KANGUR_MAIN_CONTENT_ID}`}
        aria-label='Przejdź do głównej treści'
        className='sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-full focus:bg-white/96 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-indigo-700 focus:shadow-[0_18px_40px_-28px_rgba(79,99,216,0.6)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70'
        onClick={focusSkipTarget}
        onKeyDown={handleSkipKeyDown}
      >
        Przejdź do głównej treści
      </a>
      {!embedded && <KangurAccessibilityPanel />}
      <div className='w-full min-w-0 flex-1'>
        <KangurFeatureApp />
      </div>
      <footer className='w-full border-t border-white/10 px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+24px)] text-center text-xs [color:var(--kangur-page-muted-text)] sm:px-6'>
        <span>Creator credentials: Michał Matynia · created 2026 · </span>
        <a
          className='font-semibold [color:var(--kangur-page-text)] hover:underline'
          href={getKangurPageHref('SocialUpdates', basePath)}
        >
          Social updates
        </a>
        <span> · </span>
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
