'use client';

import { useEffect, useState } from 'react';

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
import { KangurHomeLogo } from '@/features/kangur/ui/components/KangurHomeLogo';
import { useKangurClassOverrides } from '@/features/kangur/ui/useKangurClassOverrides';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';
import { cn } from '@/shared/utils';

import type { CSSProperties, JSX } from 'react';

type KangurFeaturePageProps = {
  slug?: string[];
  basePath?: string;
  embedded?: boolean;
};

const KangurBootFallback = (): JSX.Element => (
  <div
    aria-hidden='true'
    className='fixed inset-0 z-[80] flex items-center justify-center overflow-hidden px-4'
    data-testid='kangur-boot-fallback'
    style={{
      background:
        'var(--kangur-page-background, radial-gradient(circle at top, #fffdfd 0%, #f7f3f6 45%, #f3f1f8 100%))',
    }}
  >
    <div
      aria-hidden='true'
      className='absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl'
      style={{
        background:
          'radial-gradient(circle, color-mix(in srgb, var(--kangur-soft-card-border, #cbd5e1) 30%, transparent) 0%, transparent 74%)',
      }}
    />
    <div
      className='relative flex flex-col items-center justify-center gap-3 rounded-[34px] border px-10 py-9 backdrop-blur-xl'
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 90%, transparent) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 84%, var(--kangur-page-background, #f8fafc)) 100%)',
        borderColor: 'var(--kangur-glass-panel-border, rgba(255,255,255,0.78))',
        boxShadow: 'var(--kangur-glass-panel-shadow, 0 32px 84px -42px rgba(68,87,215,0.28))',
      }}
    >
      <div
        aria-hidden='true'
        className='absolute inset-[10px] rounded-[26px] border'
        style={{ borderColor: 'color-mix(in srgb, var(--kangur-soft-card-border, #e2e8f0) 56%, transparent)' }}
      />
      <div
        className='relative flex h-20 w-20 items-center justify-center rounded-full border'
        style={{
          background:
            'radial-gradient(circle at 32% 28%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 96%, white), color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 88%, var(--kangur-page-background, #eef2ff)) 58%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 80%, var(--kangur-page-background, #e2e8f0)) 100%)',
          borderColor: 'color-mix(in srgb, var(--kangur-soft-card-border, #e2e8f0) 58%, transparent)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.72), 0 18px 32px -24px rgba(68,87,215,0.26)',
        }}
      >
        <div
          aria-hidden='true'
          className='absolute inset-2 rounded-full border'
          style={{ borderColor: 'color-mix(in srgb, var(--kangur-soft-card-border, #e2e8f0) 48%, transparent)' }}
        />
        <KangurHomeLogo
          className='relative h-[28px] sm:h-[30px] md:h-[34px]'
          idPrefix='kangur-boot-fallback-logo'
        />
      </div>
      <div className='relative text-center'>
        <div className='text-[11px] font-semibold uppercase tracking-[0.32em] [color:var(--kangur-nav-item-active-text)]'>
          StudiQ
        </div>
        <div className='mt-1 text-sm font-medium tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
          Loading
        </div>
      </div>
    </div>
    <span className='sr-only'>Ladowanie aplikacji StudiQ</span>
  </div>
);

export function KangurFeaturePageShell(): JSX.Element {
  const appearance = useOptionalCmsStorefrontAppearance();
  const { embedded, pageKey, requestedPath } = useKangurRoutingState();
  const appearanceMode = appearance?.mode ?? 'default';
  const kangurAppearance = useKangurStorefrontAppearance();
  const classOverrides = useKangurClassOverrides();
  const [hasMounted, setHasMounted] = useState(false);
  const shellClassOverride = cn(
    classOverrides.globals.shell,
    classOverrides.components['kangur-feature-page-shell']?.['root']
  );
  const customCss = kangurAppearance.theme?.customCss?.trim();
  const shellStyle: CSSProperties = {
    background: kangurAppearance.background,
    color: kangurAppearance.tone.text,
    ...kangurAppearance.vars,
  };

  useEffect(() => {
    setHasMounted(true);
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
        embedded ? 'min-h-full' : 'min-h-screen',
        shellClassOverride
      )}
      data-appearance-mode={appearanceMode}
      data-kangur-appearance={appearanceMode}
      data-testid='kangur-feature-page-shell'
      style={shellStyle}
    >
      {customCss ? <style data-kangur-custom-css>{customCss}</style> : null}
      {!hasMounted ? <KangurBootFallback /> : null}
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
