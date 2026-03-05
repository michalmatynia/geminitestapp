'use client';

import type { ComponentType, JSX } from 'react';

import LegacyKangurAppModule from '@/features/kangur/legacy/App';
import {
  normalizeKangurRequestedPath,
  resolveKangurPageKeyFromSlug,
} from '@/features/kangur/config/routing';

const LegacyKangurApp = LegacyKangurAppModule as ComponentType<{
  pageKey?: string | null;
  requestedPath?: string;
}>;

export function KangurFeaturePage({ slug = [] }: { slug?: string[] }): JSX.Element {
  const activeSlug = slug[0] ?? null;
  const pageKey = resolveKangurPageKeyFromSlug(activeSlug);
  const requestedPath = normalizeKangurRequestedPath(slug);

  return <LegacyKangurApp pageKey={pageKey} requestedPath={requestedPath} />;
}
