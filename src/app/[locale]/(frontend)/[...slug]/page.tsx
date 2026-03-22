import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { JSX } from 'react';

import { KangurPublicApp } from '@/features/kangur/public';
import { getKangurConfiguredLaunchTarget } from '@/features/kangur/server/launch-route';
import { getKangurStorefrontInitialState } from '@/features/kangur/server/storefront-appearance';
import {
  buildLocalizedPathname,
  normalizeSiteLocale,
} from '@/shared/lib/i18n/site-locale';
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';

import { renderCmsPage } from '../../../(frontend)/cms-render';
import {
  getFrontPageSetting,
  shouldApplyFrontPageAppSelection,
} from '../../../(frontend)/home-helpers';
import {
  buildSlugMetadata,
  loadSlugRenderData,
  resolveSlugToPage,
} from '../../../(frontend)/[...slug]/slug-page-data';

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

  const page = await resolveSlugToPage(slug, { locale: resolvedLocale });

  if (!page) {
    return { title: routeTranslations('pageNotFoundTitle') };
  }

  return buildSlugMetadata(page);
}

export default async function LocalizedCmsSlugPage({
  params,
  searchParams,
}: LocalizedSlugPageProps): Promise<JSX.Element> {
  const { locale, slug } = await params;
  const resolvedLocale = normalizeSiteLocale(locale);

  if (await isKangurFrontPageSelected()) {
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const launchTarget = await getKangurConfiguredLaunchTarget(slug, resolvedSearchParams);
    if (launchTarget.href !== launchTarget.fallbackHref) {
      redirect(launchTarget.href);
    }

    const initialState = await getKangurStorefrontInitialState();
    return (
      <KangurPublicApp
        slug={slug}
        basePath={buildLocalizedPathname('/', resolvedLocale)}
        initialMode={initialState.initialMode}
        initialThemeSettings={initialState.initialThemeSettings}
      />
    );
  }

  const page = await resolveSlugToPage(slug, { locale: resolvedLocale });

  if (!page) {
    notFound();
  }

  const renderData = await loadSlugRenderData(page, { locale: resolvedLocale });
  return renderCmsPage(renderData);
}
