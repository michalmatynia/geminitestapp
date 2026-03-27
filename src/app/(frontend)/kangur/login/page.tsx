import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Suspense, type JSX } from 'react';

import { getKangurCanonicalPublicHref, getKangurHomeHref } from '@/features/kangur/public';
import { KangurFeatureRouteShell } from '@/features/kangur/public';
import { readSanitizedKangurAliasLoginSearchParams } from '@/features/kangur/server/login-alias-search-params';
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';

import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from '../../home-helpers';

type KangurAliasLoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({
  searchParams,
}: KangurAliasLoginPageProps): Promise<JSX.Element> {
  const translations = await getTranslations('KangurPublic');
  const shouldRedirectToCanonical = shouldApplyFrontPageAppSelection();

  if (shouldRedirectToCanonical) {
    const frontPageSetting = await getFrontPageSetting();

    if (getFrontPagePublicOwner(frontPageSetting) === 'kangur') {
      const resolvedSearchParams = await readSanitizedKangurAliasLoginSearchParams({
        searchParams: searchParams ? await searchParams : undefined,
        pathname: '/kangur/login',
        fallbackHref: getKangurHomeHref('/'),
      });
      redirect(getKangurCanonicalPublicHref(['login'], resolvedSearchParams));
    }
  }

  return (
    <Suspense fallback={<div className='sr-only'>{translations('routeLoading')}</div>}>
      <KangurFeatureRouteShell />
    </Suspense>
  );
}
