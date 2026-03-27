import { notFound, redirect } from 'next/navigation';

import { canAccessKangurSlugSegments } from '@/features/kangur/config/page-access';
import { getKangurCanonicalPublicHref } from '@/features/kangur/config/routing';
import { KangurServerShell } from '@/features/kangur/ui/components/KangurServerShell';
import { readOptionalServerAuthSession } from '@/shared/lib/auth/optional-server-auth';
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';

import {
  getFrontPageSetting,
  shouldApplyFrontPageAppSelection,
} from '@/app/(frontend)/home-helpers';

type KangurAliasPageProps = {
  params: Promise<{ slug?: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({
  params,
  searchParams,
}: KangurAliasPageProps): Promise<React.JSX.Element | null> {
  const { slug = [] } = await params;
  if (shouldApplyFrontPageAppSelection()) {
    const frontPageSetting = await getFrontPageSetting();

    if (getFrontPagePublicOwner(frontPageSetting) === 'kangur') {
      const session = await readOptionalServerAuthSession();
      if (!canAccessKangurSlugSegments(slug, session)) {
        notFound();
      }
      const resolvedSearchParams = searchParams ? await searchParams : undefined;
      redirect(getKangurCanonicalPublicHref(slug, resolvedSearchParams));
    }
  }

  return <KangurServerShell />;
}
