import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Suspense, type JSX } from 'react';

import { getKangurCanonicalPublicHref } from '@/features/kangur/config/routing';
import { KangurFeatureRouteShell } from '@/features/kangur/ui/KangurFeatureRouteShell';
import {
  buildLocalizedPathname,
  normalizeSiteLocale,
} from '@/shared/lib/i18n/site-locale';
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';

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
      const resolvedSearchParams = searchParams ? await searchParams : undefined;
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
