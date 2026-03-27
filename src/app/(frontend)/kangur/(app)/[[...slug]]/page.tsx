import { JSX } from 'react';

import { requireAccessibleKangurSlugRoute } from '@/features/kangur/server/route-access';
import { KangurServerShell } from '@/features/kangur/ui/components/KangurServerShell';

type KangurAliasPageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function Page({
  params,
}: KangurAliasPageProps): Promise<JSX.Element> {
  const { slug = [] } = await params;
  await requireAccessibleKangurSlugRoute(slug);
  return <KangurServerShell />;
}
