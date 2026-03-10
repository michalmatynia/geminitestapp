'use client';

import { useEffect } from 'react';

import {
  KANGUR_BASE_PATH,
  normalizeKangurBasePath,
  normalizeKangurRequestedPath,
  resolveKangurPageKeyFromSlug,
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
import { cn } from '@/shared/utils';

import type { JSX } from 'react';

type KangurFeaturePageProps = {
  slug?: string[];
  basePath?: string;
  embedded?: boolean;
};

export const resolveKangurFeaturePageRoute = (
  slug: string[] = [],
  basePath: string = KANGUR_BASE_PATH
): {
  normalizedBasePath: string;
  pageKey: string | null;
  requestedPath: string;
} => {
  const normalizedBasePath = normalizeKangurBasePath(basePath);
  const activeSlug = slug[0] ?? null;
  const effectiveSlug = activeSlug?.trim().toLowerCase() === 'login' ? [] : slug;
  const pageKey = resolveKangurPageKeyFromSlug(activeSlug);
  const requestedPath = normalizeKangurRequestedPath(effectiveSlug, normalizedBasePath);

  return {
    normalizedBasePath,
    pageKey,
    requestedPath,
  };
};

export function KangurFeaturePageShell(): JSX.Element {
  const { embedded, pageKey, requestedPath } = useKangurRoutingState();

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
      data-testid='kangur-feature-page-shell'
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

  return (
    <KangurRoutingProvider
      pageKey={pageKey}
      requestedPath={requestedPath}
      basePath={normalizedBasePath}
      embedded={embedded}
    >
      <KangurFeaturePageShell />
    </KangurRoutingProvider>
  );
}
