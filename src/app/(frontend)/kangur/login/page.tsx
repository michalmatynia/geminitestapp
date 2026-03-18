import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Suspense, type JSX } from 'react';

import { getKangurCanonicalPublicHref } from '@/features/kangur/config/routing';
import { KangurFeatureRouteShell } from '@/features/kangur/ui/KangurFeatureRouteShell';
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';

import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from '../../home-helpers';

type KangurAliasLoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({
  searchParams,
}: KangurAliasLoginPageProps): Promise<JSX.Element> {
  const translations = await getTranslations('KangurPublic');
  const shouldRedirectToCanonical =
    shouldApplyFrontPageAppSelection() && process.env.NODE_ENV === 'production';

  if (shouldRedirectToCanonical) {
    const frontPageSetting = await getFrontPageSetting();

    if (getFrontPagePublicOwner(frontPageSetting) === 'kangur') {
      const resolvedSearchParams = searchParams ? await searchParams : undefined;
      redirect(getKangurCanonicalPublicHref(['login'], resolvedSearchParams));
    }
  }

  return (
    <Suspense fallback={<div className='sr-only'>{translations('routeLoading')}</div>}>
      <KangurFeatureRouteShell />
    </Suspense>
  );
}
