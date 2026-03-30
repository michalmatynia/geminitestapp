import 'server-only';

import { JSX } from 'react';

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
  const resolvedLocale = typeof locale === 'string' ? normalizeSiteLocale(locale) : undefined;
  return <ProductPublicPage params={{ id }} locale={resolvedLocale} />;
};
