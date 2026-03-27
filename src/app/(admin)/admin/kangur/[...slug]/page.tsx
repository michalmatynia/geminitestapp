import { type JSX } from 'react';

import { AdminKangurPageShell } from '@/features/kangur/public';
import { requireAccessibleKangurSlugRoute } from '@/features/kangur/server/route-access';

export default async function AdminKangurSlugPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<JSX.Element> {
  const resolvedParams = await params;
  await requireAccessibleKangurSlugRoute(resolvedParams.slug);

  return <AdminKangurPageShell slug={resolvedParams.slug} />;
}
