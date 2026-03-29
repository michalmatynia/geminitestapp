import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { JSX } from 'react';

import { getKangurPublicAliasHref } from '@/features/kangur/config/routing';
import { getKangurConfiguredLaunchTarget } from '@/features/kangur/server';
import { requireAccessibleKangurSlugRoute } from '@/features/kangur/server';
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';

import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from '../home-helpers';

import type { Metadata } from 'next';

export const revalidate = 3600; // Hourly revalidation for CMS slug pages

interface SlugPageProps {
  params: Promise<{ slug: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const isKangurFrontPageSelected = async (): Promise<boolean> => {
  if (!shouldApplyFrontPageAppSelection()) {
    return false;
  }
  const frontPageSetting = await getFrontPageSetting();
  return getFrontPagePublicOwner(frontPageSetting) === 'kangur';
};

const loadCmsSlugPageModules = async () => {
  const [{ renderCmsPage }, slugPageData] = await Promise.all([
    import('../cms-render'),
    import('./slug-page-data'),
  ]);

  return {
    renderCmsPage,
    ...slugPageData,
  };
};

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const routeTranslations = await getTranslations('Routes');
  if (await isKangurFrontPageSelected()) {
    return {
      title:
        slug[0]?.trim().toLowerCase() === 'login'
          ? routeTranslations('loginTitle')
          : routeTranslations('siteTitle'),
    };
  }
  const { buildSlugMetadata, resolveSlugToPage } = await loadCmsSlugPageModules();
  const page = await resolveSlugToPage(slug);

  if (!page) {
    return { title: routeTranslations('pageNotFoundTitle') };
  }

  return buildSlugMetadata(page);
}

export default async function CmsSlugPage({
  params,
  searchParams,
}: SlugPageProps): Promise<JSX.Element | null> {
  const { slug } = await params;
  if (await isKangurFrontPageSelected()) {
    await requireAccessibleKangurSlugRoute(slug);

    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const launchTarget = await getKangurConfiguredLaunchTarget(slug, resolvedSearchParams);
    if (launchTarget.href !== launchTarget.fallbackHref) {
      redirect(launchTarget.href);
    }

    if (slug[0]?.trim().toLowerCase() === 'login') {
      return null;
    }

    redirect(getKangurPublicAliasHref(slug, resolvedSearchParams));
  }
  const { loadSlugRenderData, renderCmsPage, resolveSlugToPage } = await loadCmsSlugPageModules();
  const page = await resolveSlugToPage(slug);

  if (!page) {
    notFound();
  }

  const renderData = await loadSlugRenderData(page);
  return renderCmsPage(renderData);
}
