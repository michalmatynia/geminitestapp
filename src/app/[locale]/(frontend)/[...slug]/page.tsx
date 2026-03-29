import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { JSX } from 'react';

import { getKangurPublicLaunchHref } from '@/features/kangur/config/routing';
import { getKangurConfiguredLaunchRoute } from '@/features/kangur/server';
import { requireAccessibleKangurSlugRoute } from '@/features/kangur/server';
import { buildLocalizedPathname, normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';

import {
  getFrontPageSetting,
  shouldApplyFrontPageAppSelection,
} from '@/app/(frontend)/home-helpers';

import type { Metadata } from 'next';

export const revalidate = 3600;

type LocalizedSlugPageProps = {
  params: Promise<{ locale: string; slug: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const isKangurFrontPageSelected = async (): Promise<boolean> => {
  if (!shouldApplyFrontPageAppSelection()) {
    return false;
  }
  const frontPageSetting = await getFrontPageSetting();
  return getFrontPagePublicOwner(frontPageSetting) === 'kangur';
};

const loadLocalizedCmsSlugPageModules = async () => {
  const [{ renderCmsPage }, slugPageData] = await Promise.all([
    import('@/app/(frontend)/cms-render'),
    import('@/app/(frontend)/[...slug]/slug-page-data'),
  ]);

  return {
    renderCmsPage,
    ...slugPageData,
  };
};

export async function generateMetadata({
  params,
}: LocalizedSlugPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const resolvedLocale = normalizeSiteLocale(locale);
  const routeTranslations = await getTranslations({
    locale: resolvedLocale,
    namespace: 'Routes',
  });

  if (await isKangurFrontPageSelected()) {
    return {
      title:
        slug[0]?.trim().toLowerCase() === 'login'
          ? routeTranslations('loginTitle')
      : routeTranslations('siteTitle'),
    };
  }

  const { buildSlugMetadata, resolveSlugToPage } = await loadLocalizedCmsSlugPageModules();
  const page = await resolveSlugToPage(slug, { locale: resolvedLocale });

  if (!page) {
    return { title: routeTranslations('pageNotFoundTitle') };
  }

  return buildSlugMetadata(page);
}

export default async function LocalizedCmsSlugPage({
  params,
  searchParams,
}: LocalizedSlugPageProps): Promise<JSX.Element | null> {
  const { locale, slug } = await params;
  const resolvedLocale = normalizeSiteLocale(locale);

  if (await isKangurFrontPageSelected()) {
    await requireAccessibleKangurSlugRoute(slug);

    if (slug[0]?.trim().toLowerCase() === 'login') {
      return null;
    }

    const [launchRoute, resolvedSearchParams] = await Promise.all([
      getKangurConfiguredLaunchRoute(),
      searchParams ? searchParams : Promise.resolve(undefined),
    ]);

    redirect(
      buildLocalizedPathname(
        getKangurPublicLaunchHref(launchRoute, slug, resolvedSearchParams),
        resolvedLocale
      )
    );
  }

  const { loadSlugRenderData, renderCmsPage, resolveSlugToPage } =
    await loadLocalizedCmsSlugPageModules();
  const page = await resolveSlugToPage(slug, { locale: resolvedLocale });

  if (!page) {
    notFound();
  }

  const renderData = await loadSlugRenderData(page, { locale: resolvedLocale });
  return renderCmsPage(renderData);
}
