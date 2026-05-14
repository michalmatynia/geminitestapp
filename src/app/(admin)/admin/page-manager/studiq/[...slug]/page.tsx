import { type JSX } from 'react';

import { AdminKangurPageShell } from '@/features/kangur/public';
import { requireAccessibleKangurSlugRoute } from '@/features/kangur/server';

export default async function AdminStudiQSlugPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<JSX.Element> {
  const resolvedParams = await params;
  await requireAccessibleKangurSlugRoute(resolvedParams.slug);

  return (
    <AdminKangurPageShell
      basePath='/admin/page-manager/studiq'
      slug={resolvedParams.slug}
    />
  );
}
