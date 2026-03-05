import { type JSX } from 'react';

import { AdminKangurPageShell } from '@/features/kangur/admin/AdminKangurPageShell';

export default async function AdminKangurSlugPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<JSX.Element> {
  const resolvedParams = await params;
  return <AdminKangurPageShell slug={resolvedParams.slug} />;
}
