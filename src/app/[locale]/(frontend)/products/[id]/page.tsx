import { type JSX } from 'react';

import { renderProductPublicRoute } from '@/app/(frontend)/products/product-route-helpers';

type LocalizedProductPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function LocalizedProductPage({
  params,
}: LocalizedProductPageProps): Promise<JSX.Element> {
  const { locale, id } = await params;
  return renderProductPublicRoute({ id, locale });
}
