'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import { useOptionalCmsStorefrontAppearance } from '@/features/cms/public';
import {
  KANGUR_BASE_PATH,
  KANGUR_MAIN_PAGE_KEY,
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
import { localizeManagedKangurHref } from '@/features/kangur/ui/routing/managed-paths';
import { KANGUR_MAIN_CONTENT_ID } from '@/features/kangur/ui/design/primitives/KangurPageContainer';
import { useKangurMobileViewportVars } from '@/features/kangur/ui/hooks/useKangurMobileViewportVars';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';
import { buildKangurScopedCustomCss } from '@/features/kangur/utils/custom-css';
import { isKangurThemeDebugEnabled } from '@/features/kangur/utils/theme-debug';
import { cn } from '@/features/kangur/shared/utils';
import { logger } from '@/shared/utils/logger';

import type { CSSProperties, JSX, KeyboardEvent } from 'react';

type KangurFeaturePageProps = {
  slug?: string[];
  basePath?: string;
  embedded?: boolean;
  forceBodyScrollLock?: boolean;
};

type KangurFeaturePageShellProps = {
  forceBodyScrollLock?: boolean;
};

const KANGUR_CUSTOM_CSS_SCOPE_SELECTOR = '[data-kangur-custom-css-scope="true"]';

export function KangurFeaturePageShell({
  forceBodyScrollLock = false,
}: KangurFeaturePageShellProps): JSX.Element {
  const locale = useLocale() ?? 'en';
  const commonTranslations = useTranslations('Common');
  const shellTranslations = useTranslations('KangurShell');
  const appearance = useOptionalCmsStorefrontAppearance();
  const { embedded, pageKey, requestedPath, basePath } = useKangurRoutingState();
  const resolvedPageKey = pageKey ?? KANGUR_MAIN_PAGE_KEY;
  const appearanceMode = appearance?.mode ?? 'default';
  const showFooter = !embedded && resolvedPageKey === KANGUR_MAIN_PAGE_KEY;
  const kangurAppearance = useKangurStorefrontAppearance();
  const debugRef = useRef<string | null>(null);
  const browserPathname = typeof window === 'undefined' ? null : window.location.pathname?.trim() || null;
  const socialUpdatesHref = useMemo(
    () =>
      localizeManagedKangurHref({
        href: getKangurPageHref('SocialUpdates', basePath),
        locale,
        pathname: browserPathname ?? requestedPath ?? null,
      }),
    [basePath, browserPathname, locale, requestedPath]
  );
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
  const shellStyle: CSSProperties & Record<string, string> = {
    ...kangurAppearance.vars,
  };
  const scopedCustomCss = useMemo(() => {
    if (process.env['NEXT_PUBLIC_KANGUR_CUSTOM_CSS_ENABLED'] !== 'true') {
      return null;
    }

    return buildKangurScopedCustomCss(
      kangurAppearance.theme?.customCss,
      kangurAppearance.theme?.customCssSelectors,
      KANGUR_CUSTOM_CSS_SCOPE_SELECTOR
    );
  }, [kangurAppearance.theme?.customCss, kangurAppearance.theme?.customCssSelectors]);

  useEffect(() => {
    if (!isKangurThemeDebugEnabled()) return;
    const payload = {
      mode: appearanceMode,
      themePreset: kangurAppearance.theme?.themePreset ?? null,
    };
    const signature = JSON.stringify(payload);
    if (debugRef.current === signature) return;
    debugRef.current = signature;
    logger.info('[KangurThemeDebug]', payload);
  }, [appearanceMode, kangurAppearance.theme?.themePreset]);

  useEffect(() => {
    setKangurClientObservabilityContext({
      pageKey: resolvedPageKey,
      requestedPath: requestedPath ?? '',
    });
    return () => {
      clearKangurClientObservabilityContext();
    };
  }, [requestedPath, resolvedPageKey]);

  const shouldLockBodyScroll = forceBodyScrollLock || !embedded;

  useKangurMobileViewportVars();

  useLayoutEffect(() => {
    if (!shouldLockBodyScroll || typeof document === 'undefined') {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.dataset['kangurShell'] = 'true';

    return () => {
      document.body.style.overflow = previousOverflow;
      delete document.body.dataset['kangurShell'];
    };
  }, [shouldLockBodyScroll]);

  return (
    <div
      className={cn(
        'relative flex w-full min-w-0 flex-col overflow-x-hidden kangur-premium-bg kangur-shell-viewport-height',
        embedded ? 'min-h-full' : null
      )}
      data-appearance-mode={appearanceMode}
      data-kangur-custom-css-scope='true'
      data-kangur-appearance={appearanceMode}
      data-testid='kangur-feature-page-shell'
      lang={locale}
      style={shellStyle}
    >
      {scopedCustomCss ? <style data-kangur-custom-css='true'>{scopedCustomCss}</style> : null}
      <a
        href={`#${KANGUR_MAIN_CONTENT_ID}`}
        aria-label={commonTranslations('skipToMainContent')}
        className='sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-full focus:bg-white/96 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-indigo-700 focus:shadow-[0_18px_40px_-28px_rgba(79,99,216,0.6)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70'
        onClick={focusSkipTarget}
        onKeyDown={handleSkipKeyDown}
      >
        {commonTranslations('skipToMainContent')}
      </a>
      <div className='w-full min-w-0 flex-1'>
        <KangurFeatureApp />
      </div>
      {showFooter ? (
        <footer className='hidden w-full border-t px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+24px)] text-center text-xs [border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_62%,transparent)] [color:var(--kangur-page-muted-text)] sm:block sm:px-6'>
          <span>
            {shellTranslations('creatorCredentials', {
              name: 'Michał Matynia',
              year: '2026',
            })}
          </span>
          <a
            className='font-semibold [color:var(--kangur-page-text)] hover:underline'
            href={socialUpdatesHref}
          >
            {shellTranslations('socialUpdates')}
          </a>
          <span> · </span>
          <a
            className='font-semibold [color:var(--kangur-page-text)] hover:underline'
            href='mailto:mmatynia@gmail.com'
          >
            {shellTranslations('contactLabel', { email: 'mmatynia@gmail.com' })}
          </a>
          <span> · </span>
          <span>{shellTranslations('supportLabel')}</span>
          <span> </span>
          <a
            className='font-semibold [color:var(--kangur-page-text)] hover:underline'
            href='https://buycoffe.to/studiq'
            target='_blank'
            rel='noopener noreferrer'
          >
            buycoffe.to/studiq
          </a>
          <span> · </span>
          <a
            className='font-semibold [color:var(--kangur-page-text)] hover:underline'
            href='https://zrzutka.pl/b8ak55'
            target='_blank'
            rel='noopener noreferrer'
          >
            zrzutka.pl/b8ak55
          </a>
        </footer>
      ) : null}
    </div>
  );
}

export function KangurFeaturePage({
  slug = [],
  basePath = KANGUR_BASE_PATH,
  embedded = false,
  forceBodyScrollLock = false,
}: KangurFeaturePageProps): JSX.Element {
  const {
    normalizedBasePath,
    pageKey,
    requestedPath,
  } = resolveKangurFeaturePageRoute(slug, basePath);
  const isEmbedded = embedded;

  return (
    <KangurRoutingProvider
      pageKey={pageKey}
      requestedPath={requestedPath}
      requestedHref={requestedPath}
      basePath={normalizedBasePath}
      embedded={isEmbedded}
    >
      <KangurFeaturePageShell forceBodyScrollLock={forceBodyScrollLock} />
    </KangurRoutingProvider>
  );
}
