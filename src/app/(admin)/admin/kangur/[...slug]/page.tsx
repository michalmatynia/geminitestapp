import { type JSX } from 'react';
import { notFound } from 'next/navigation';

import { auth } from '@/features/auth/server';
import { canAccessKangurSlugSegments } from '@/features/kangur/config/page-access';
import { AdminKangurPageShell } from '@/features/kangur/admin/AdminKangurPageShell';

export default async function AdminKangurSlugPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<JSX.Element> {
  const resolvedParams = await params;
  const session = await auth().catch(() => null);

  if (!canAccessKangurSlugSegments(resolvedParams.slug, session)) {
    notFound();
  }

  return <AdminKangurPageShell slug={resolvedParams.slug} />;
}
