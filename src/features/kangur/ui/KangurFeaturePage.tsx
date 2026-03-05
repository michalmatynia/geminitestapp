'use client';

import type { JSX } from 'react';

import {
  normalizeKangurRequestedPath,
  resolveKangurPageKeyFromSlug,
} from '@/features/kangur/config/routing';
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurFeatureApp } from '@/features/kangur/ui/KangurFeatureApp';

export function KangurFeaturePage({ slug = [] }: { slug?: string[] }): JSX.Element {
  const activeSlug = slug[0] ?? null;
  const pageKey = resolveKangurPageKeyFromSlug(activeSlug);
  const requestedPath = normalizeKangurRequestedPath(slug);

  return (
    <KangurRoutingProvider pageKey={pageKey} requestedPath={requestedPath}>
      <KangurFeatureApp />
    </KangurRoutingProvider>
  );
}
