import type { JSX } from 'react';
import { redirect } from 'next/navigation';

import { getKangurCanonicalPublicHref } from '@/features/kangur/config/routing';
import { KangurLoginPage } from '@/features/kangur/ui/KangurLoginPage';
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';

import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from '../../home-helpers';

type KangurAliasLoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({
  searchParams,
}: KangurAliasLoginPageProps): Promise<JSX.Element> {
  if (shouldApplyFrontPageAppSelection()) {
    const frontPageSetting = await getFrontPageSetting();

    if (getFrontPagePublicOwner(frontPageSetting) === 'kangur') {
      const resolvedSearchParams = searchParams ? await searchParams : undefined;
      redirect(getKangurCanonicalPublicHref(['login'], resolvedSearchParams));
    }
  }

  return <KangurLoginPage defaultCallbackUrl='/kangur' backHref='/kangur' />;
}
