import 'server-only';

import { type JSX } from 'react';

import { applyCacheLife } from '@/shared/lib/next/cache-life';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

import { ProductPublicPage } from '@/app/(frontend)/products/ProductPublicPage';

type RenderProductPublicRouteOptions = {
  id: string;
  locale?: string | null;
};

export const renderProductPublicRoute = async ({
  id,
  locale,
}: RenderProductPublicRouteOptions): Promise<JSX.Element> => {
  'use cache';
  applyCacheLife('hours');

  const resolvedLocale = typeof locale === 'string' ? normalizeSiteLocale(locale) : undefined;
  return <ProductPublicPage params={{ id }} locale={resolvedLocale} />;
};
