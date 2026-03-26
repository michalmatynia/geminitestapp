import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Suspense, type JSX } from 'react';

import { auth } from '@/features/auth/server';
import { getKangurCanonicalPublicHref, getKangurHomeHref } from '@/features/kangur/config/routing';
import { KangurFeatureRouteShell } from '@/features/kangur/ui/KangurFeatureRouteShell';
import {
  buildLocalizedPathname,
  normalizeSiteLocale,
} from '@/shared/lib/i18n/site-locale';
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';

import { sanitizeKangurAliasLoginSearchParams } from '@/app/(frontend)/kangur/login/alias-search-params';
import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from '@/app/(frontend)/home-helpers';

type LocalizedKangurAliasLoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LocalizedKangurLoginPage({
  params,
  searchParams,
}: LocalizedKangurAliasLoginPageProps): Promise<JSX.Element> {
  const { locale } = await params;
  const resolvedLocale = normalizeSiteLocale(locale);
  const translations = await getTranslations({
    locale: resolvedLocale,
    namespace: 'KangurPublic',
  });
  const shouldRedirectToCanonical = shouldApplyFrontPageAppSelection();

  if (shouldRedirectToCanonical) {
    const frontPageSetting = await getFrontPageSetting();

    if (getFrontPagePublicOwner(frontPageSetting) === 'kangur') {
      const session = await auth();
      const resolvedSearchParams = sanitizeKangurAliasLoginSearchParams({
        searchParams: searchParams ? await searchParams : undefined,
        pathname: buildLocalizedPathname('/kangur/login', resolvedLocale),
        fallbackHref: buildLocalizedPathname(getKangurHomeHref('/'), resolvedLocale),
        session,
      });
      redirect(
        buildLocalizedPathname(
          getKangurCanonicalPublicHref(['login'], resolvedSearchParams),
          resolvedLocale
        )
      );
    }
  }

  return (
    <Suspense fallback={<div className='sr-only'>{translations('routeLoading')}</div>}>
      <KangurFeatureRouteShell />
    </Suspense>
  );
}
