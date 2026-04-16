import { type JSX } from 'react';

import { renderProductPublicRoute } from '../product-route-helpers';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> {
  const resolvedParams = await params;
  return renderProductPublicRoute({ id: resolvedParams.id });
}
