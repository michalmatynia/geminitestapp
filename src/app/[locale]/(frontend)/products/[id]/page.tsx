import { JSX } from 'react';

import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

import { ProductPublicPage } from '@/app/(frontend)/products/[id]/ProductPublicPage';

export const revalidate = 3600;

type LocalizedProductPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function LocalizedProductPage({
  params,
}: LocalizedProductPageProps): Promise<JSX.Element> {
  const { locale, id } = await params;

  return <ProductPublicPage params={{ id }} locale={normalizeSiteLocale(locale)} />;
}
