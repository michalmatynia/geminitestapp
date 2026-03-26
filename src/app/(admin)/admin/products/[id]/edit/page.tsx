import { JSX } from 'react';

import ProductEditPage from '@/features/products/pages/ProductEditPage';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> {
  const resolvedParams = await params;
  return <ProductEditPage params={Promise.resolve(resolvedParams)} />;
}
