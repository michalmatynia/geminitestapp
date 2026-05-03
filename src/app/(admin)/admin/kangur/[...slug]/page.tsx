/*
 * StudiQ Admin - Kangur slug page
 *
 * Purpose: Renders admin pages for a specific Kangur slug.
 * Accessibility notes:
 * - Validate slug-accessibility with requireAccessibleKangurSlugRoute before
 *   rendering to avoid exposing pages without the correct accessibility props.
 * - The rendered admin shell must expose a main landmark and descriptive H1.
 */
import { type JSX } from 'react';

import { AdminKangurPageShell } from '@/features/kangur/public';
import { requireAccessibleKangurSlugRoute } from '@/features/kangur/server';

export default async function AdminKangurSlugPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<JSX.Element> {
  const resolvedParams = await params;
  await requireAccessibleKangurSlugRoute(resolvedParams.slug);

  return <AdminKangurPageShell slug={resolvedParams.slug} />;
}
