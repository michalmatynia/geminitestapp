import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Suspense, type JSX } from 'react';

import { getKangurCanonicalPublicHref, getKangurHomeHref } from '@/features/kangur/config/routing';
import { KangurFeatureRouteShell } from '@/features/kangur/ui/KangurFeatureRouteShell';
import { readOptionalServerAuthSession } from '@/shared/lib/auth/optional-server-auth';
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';

import { sanitizeKangurAliasLoginSearchParams } from './alias-search-params';
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
      const session = await readOptionalServerAuthSession();
      const resolvedSearchParams = sanitizeKangurAliasLoginSearchParams({
        searchParams: searchParams ? await searchParams : undefined,
        pathname: '/kangur/login',
        fallbackHref: getKangurHomeHref('/'),
        session,
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
