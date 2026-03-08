import { redirect } from 'next/navigation';

import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from '@/app/(frontend)/home-helpers';
import { getKangurCanonicalPublicHref } from '@/features/kangur/config/routing';
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';

type KangurAliasPageProps = {
  params: Promise<{ slug?: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({
  params,
  searchParams,
}: KangurAliasPageProps): Promise<null> {
  if (shouldApplyFrontPageAppSelection()) {
    const frontPageSetting = await getFrontPageSetting();

    if (getFrontPagePublicOwner(frontPageSetting) === 'kangur') {
      const { slug = [] } = await params;
      const resolvedSearchParams = searchParams ? await searchParams : undefined;
      redirect(getKangurCanonicalPublicHref(slug, resolvedSearchParams));
    }
  }

  return null;
}
