import 'server-only';

import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Suspense, type JSX } from 'react';

import { resolveFrontPageSelection } from '@/app/(frontend)/home/home-helpers';
import {
  getKangurCanonicalPublicHref,
  getKangurHomeHref,
} from '@/features/kangur/config/routing';
import { readSanitizedKangurAliasLoginSearchParams } from '@/features/kangur/server';
import { KangurFeatureRouteShell } from '@/features/kangur/ui/KangurFeatureRouteShell';
import { buildLocalizedPathname, normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

type KangurAliasLoginSearchParams = Record<string, string | string[] | undefined>;

type RenderKangurLoginAliasRouteOptions = {
  locale?: string | null;
  searchParams?: KangurAliasLoginSearchParams;
};

const resolveAliasLocale = (locale?: string | null): string | undefined =>
  typeof locale === 'string' ? normalizeSiteLocale(locale) : undefined;

const localizeAliasPath = (pathname: string, locale?: string): string =>
  (typeof locale === 'string' && locale !== '') ? buildLocalizedPathname(pathname, locale) : pathname;

export const renderKangurLoginAliasRoute = async ({
  locale,
  searchParams,
}: RenderKangurLoginAliasRouteOptions = {}): Promise<JSX.Element> => {
  const resolvedLocale = resolveAliasLocale(locale);
  const translations = (typeof resolvedLocale === 'string' && resolvedLocale !== '')
    ? await getTranslations({ locale: resolvedLocale, namespace: 'KangurPublic' })
    : await getTranslations('KangurPublic');
  const frontPageSelection = await resolveFrontPageSelection();

  if (frontPageSelection.publicOwner === 'kangur') {
    const resolvedSearchParams = await readSanitizedKangurAliasLoginSearchParams({
      searchParams,
      pathname: localizeAliasPath('/kangur/login', resolvedLocale),
      fallbackHref: localizeAliasPath(getKangurHomeHref('/'), resolvedLocale),
    });
    redirect(
      localizeAliasPath(
        getKangurCanonicalPublicHref(['login'], resolvedSearchParams),
        resolvedLocale
      )
    );
  }

  return (
    <Suspense fallback={<div className='sr-only'>{translations('routeLoading')}</div>}>
      <KangurFeatureRouteShell />
    </Suspense>
  );
};
