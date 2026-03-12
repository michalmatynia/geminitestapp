'use client';

import { useEffect } from 'react';

import {
  useOptionalCmsStorefrontAppearance,
} from '@/features/cms/components/frontend/CmsStorefrontAppearance';
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
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';
import { cn } from '@/shared/utils';

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
  const shellStyle: CSSProperties = {
    background: kangurAppearance.background,
    color: kangurAppearance.tone.text,
    ...kangurAppearance.vars,
  };

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
        embedded ? 'min-h-full' : 'min-h-screen'
      )}
      data-appearance-mode={appearanceMode}
      data-kangur-appearance={appearanceMode}
      data-testid='kangur-feature-page-shell'
      style={shellStyle}
    >
      <KangurFeatureApp />
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
