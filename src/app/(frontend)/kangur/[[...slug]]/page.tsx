import { type JSX } from 'react';

import { KangurFeaturePage } from '@/features/kangur/public';

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<JSX.Element> {
  const resolvedParams = await params;
  return <KangurFeaturePage slug={resolvedParams.slug ?? []} />;
}
