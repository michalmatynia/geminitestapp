import { type JSX } from 'react';
import { notFound } from 'next/navigation';

import { canAccessKangurSlugSegments } from '@/features/kangur/config/page-access';
import { AdminKangurPageShell } from '@/features/kangur/admin/AdminKangurPageShell';
import { readOptionalServerAuthSession } from '@/shared/lib/auth/optional-server-auth';

export default async function AdminKangurSlugPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<JSX.Element> {
  const resolvedParams = await params;
  const session = await readOptionalServerAuthSession();

  if (!canAccessKangurSlugSegments(resolvedParams.slug, session)) {
    notFound();
  }

  return <AdminKangurPageShell slug={resolvedParams.slug} />;
}
