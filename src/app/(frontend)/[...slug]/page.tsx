import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { JSX } from 'react';

import { KangurPublicApp } from '@/features/kangur/public';
import { getKangurStorefrontInitialState } from '@/features/kangur/server/storefront-appearance';
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';

import { renderCmsPage } from '../cms-render';
import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from '../home-helpers';
import { buildSlugMetadata, loadSlugRenderData, resolveSlugToPage } from './slug-page-data';

import type { Metadata } from 'next';

export const revalidate = 3600; // Hourly revalidation for CMS slug pages

interface SlugPageProps {
  params: Promise<{ slug: string[] }>;
}

const isKangurFrontPageSelected = async (): Promise<boolean> => {
  if (!shouldApplyFrontPageAppSelection()) {
    return false;
  }
  const frontPageSetting = await getFrontPageSetting();
  return getFrontPagePublicOwner(frontPageSetting) === 'kangur';
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
  const page = await resolveSlugToPage(slug);

  if (!page) {
    return { title: routeTranslations('pageNotFoundTitle') };
  }

  return buildSlugMetadata(page);
}

export default async function CmsSlugPage({ params }: SlugPageProps): Promise<JSX.Element> {
  const { slug } = await params;
  if (await isKangurFrontPageSelected()) {
    const initialState = await getKangurStorefrontInitialState();
    return (
      <KangurPublicApp
        slug={slug}
        basePath='/'
        initialMode={initialState.initialMode}
        initialThemeSettings={initialState.initialThemeSettings}
      />
    );
  }
  const page = await resolveSlugToPage(slug);

  if (!page) {
    notFound();
  }

  const renderData = await loadSlugRenderData(page);
  return renderCmsPage(renderData);
}
