import 'server-only';

import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { JSX } from 'react';

import { renderCmsPage } from '@/app/(frontend)/cms/render';
import {
  buildSlugMetadata,
  loadSlugRenderData,
  resolveSlugToPage,
} from '@/app/(frontend)/cms/slug-page-data';
import { resolveFrontPageSelection } from '@/app/(frontend)/home/home-helpers';
import { getKangurPublicLaunchHref } from '@/features/kangur/public';
import { getKangurConfiguredLaunchRoute, requireAccessibleKangurSlugRoute } from '@/features/kangur/server';
import { buildLocalizedPathname, normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

import type { Metadata } from 'next';

type SlugSearchParams = Record<string, string | string[] | undefined>;

type CmsSlugRouteOptions = {
  locale?: string | null;
  slug: string[];
  searchParams?: SlugSearchParams;
};

type CmsSlugMetadataOptions = {
  locale?: string | null;
  slug: string[];
};

const isKangurFrontPageSelected = async (): Promise<boolean> => {
  return (await resolveFrontPageSelection()).publicOwner === 'kangur';
};

const resolveSlugLocale = (locale?: string | null): string | undefined =>
  typeof locale === 'string' ? normalizeSiteLocale(locale) : undefined;

const localizeSlugPath = (pathname: string, locale?: string): string =>
  locale ? buildLocalizedPathname(pathname, locale) : pathname;

export const generateCmsSlugRouteMetadata = async ({
  locale,
  slug,
}: CmsSlugMetadataOptions): Promise<Metadata> => {
  const resolvedLocale = resolveSlugLocale(locale);
  const routeTranslations = resolvedLocale
    ? await getTranslations({ locale: resolvedLocale, namespace: 'Routes' })
    : await getTranslations('Routes');

  if (await isKangurFrontPageSelected()) {
    return {
      title:
        slug[0]?.trim().toLowerCase() === 'login'
          ? routeTranslations('loginTitle')
          : routeTranslations('siteTitle'),
    };
  }

  const page = await resolveSlugToPage(slug, resolvedLocale ? { locale: resolvedLocale } : undefined);
  if (!page) {
    return { title: routeTranslations('pageNotFoundTitle') };
  }

  return buildSlugMetadata(page);
};

export const renderCmsSlugRoute = async ({
  locale,
  slug,
  searchParams,
}: CmsSlugRouteOptions): Promise<JSX.Element | null> => {
  const resolvedLocale = resolveSlugLocale(locale);

  if (await isKangurFrontPageSelected()) {
    await requireAccessibleKangurSlugRoute(slug);

    if (slug[0]?.trim().toLowerCase() === 'login') {
      return null;
    }

    const launchRoute = await getKangurConfiguredLaunchRoute();
    redirect(
      localizeSlugPath(getKangurPublicLaunchHref(launchRoute, slug, searchParams), resolvedLocale)
    );
  }

  const page = await resolveSlugToPage(slug, resolvedLocale ? { locale: resolvedLocale } : undefined);
  if (!page) {
    notFound();
  }

  const renderData = await loadSlugRenderData(
    page,
    resolvedLocale ? { locale: resolvedLocale } : undefined
  );
  return renderCmsPage(renderData);
};
