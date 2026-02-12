import { JSX } from 'react';

import { ProductPublicPage } from '@/features/products/server';

export const revalidate = 3600; // Hourly revalidation for product details

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> {
  const resolvedParams = await params;
  return <ProductPublicPage params={resolvedParams} />;
}