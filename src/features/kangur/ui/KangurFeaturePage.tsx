'use client';

import type { JSX } from 'react';
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

export function KangurFeaturePage({
  slug = [],
  basePath = KANGUR_BASE_PATH,
}: {
  slug?: string[];
  basePath?: string;
}): JSX.Element {
  const normalizedBasePath = normalizeKangurBasePath(basePath);
  const activeSlug = slug[0] ?? null;
  const pageKey = resolveKangurPageKeyFromSlug(activeSlug);
  const requestedPath = normalizeKangurRequestedPath(slug, normalizedBasePath);

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
    <KangurRoutingProvider
      pageKey={pageKey}
      requestedPath={requestedPath}
      basePath={normalizedBasePath}
    >
      <KangurFeatureApp />
    </KangurRoutingProvider>
  );
}
