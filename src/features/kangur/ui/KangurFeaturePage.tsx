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
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurFeatureApp } from '@/features/kangur/ui/KangurFeatureApp';
import { cn } from '@/shared/utils';

import type { JSX } from 'react';

export function KangurFeaturePage({
  slug = [],
  basePath = KANGUR_BASE_PATH,
  embedded = false,
}: {
  slug?: string[];
  basePath?: string;
  embedded?: boolean;
}): JSX.Element {
  const normalizedBasePath = normalizeKangurBasePath(basePath);
  const activeSlug = slug[0] ?? null;
  const effectiveSlug = activeSlug?.trim().toLowerCase() === 'login' ? [] : slug;
  const pageKey = resolveKangurPageKeyFromSlug(activeSlug);
  const requestedPath = normalizeKangurRequestedPath(effectiveSlug, normalizedBasePath);

  useEffect(() => {
    setKangurClientObservabilityContext({
      pageKey,
      requestedPath,
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
      <KangurRoutingProvider
        pageKey={pageKey}
        requestedPath={requestedPath}
        basePath={normalizedBasePath}
        embedded={embedded}
      >
        <KangurFeatureApp />
      </KangurRoutingProvider>
    </div>
  );
}
