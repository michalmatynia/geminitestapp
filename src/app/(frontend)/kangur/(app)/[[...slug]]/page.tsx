import { redirect } from 'next/navigation';

import { getKangurCanonicalPublicHref } from '@/features/kangur/config/routing';
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';

import { getFrontPageSetting, shouldUseFrontPageAppRedirect } from '../../../home-helpers';

type KangurAliasPageProps = {
  params: Promise<{ slug?: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({
  params,
  searchParams,
}: KangurAliasPageProps): Promise<null> {
  if (shouldUseFrontPageAppRedirect()) {
    const frontPageSetting = await getFrontPageSetting();

    if (getFrontPagePublicOwner(frontPageSetting) === 'kangur') {
      const { slug = [] } = await params;
      const resolvedSearchParams = searchParams ? await searchParams : undefined;
      redirect(getKangurCanonicalPublicHref(slug, resolvedSearchParams));
    }
  }

  return null;
}
