import { JSX } from 'react';

import { renderProductPublicRoute } from './product-route-helpers';

export const revalidate = 3600; // Hourly revalidation for product details

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> {
  const resolvedParams = await params;
  return renderProductPublicRoute({ id: resolvedParams.id });
}
