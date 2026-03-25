import { redirect } from 'next/navigation';

import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from '@/app/(frontend)/home-helpers';
import { getKangurConfiguredLaunchHref } from '@/features/kangur/server/launch-route';
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
    const [frontPageSetting, { slug = [] }, resolvedSearchParams] = await Promise.all([
      getFrontPageSetting(),
      params,
      searchParams ?? Promise.resolve(undefined),
    ]);

    if (getFrontPagePublicOwner(frontPageSetting) === 'kangur') {
      redirect(await getKangurConfiguredLaunchHref(slug, resolvedSearchParams));
    }
  }

  return null;
}
