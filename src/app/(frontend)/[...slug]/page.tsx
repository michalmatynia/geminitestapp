import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { JSX } from 'react';

import { auth } from '@/features/auth/server';
import { canAccessKangurSlugSegments } from '@/features/kangur/config/page-access';
import { getKangurConfiguredLaunchTarget } from '@/features/kangur/server/launch-route';
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';

import { renderCmsPage } from '../cms-render';
import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from '../home-helpers';
import { buildSlugMetadata, loadSlugRenderData, resolveSlugToPage } from './slug-page-data';

import type { Metadata } from 'next';

export const revalidate = 3600; // Hourly revalidation for CMS slug pages

interface SlugPageProps {
  params: Promise<{ slug: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const isMissingRequestScopeError = (error: unknown): boolean =>
  error instanceof Error && error.message.includes('outside a request scope');

const readOptionalAuthSession = async () => {
  try {
    return await auth();
  } catch (error) {
    if (isMissingRequestScopeError(error)) {
      return null;
    }
    throw error;
  }
};

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

export default async function CmsSlugPage({
  params,
  searchParams,
}: SlugPageProps): Promise<JSX.Element | null> {
  const { slug } = await params;
  if (await isKangurFrontPageSelected()) {
    const session = await readOptionalAuthSession();
    if (!canAccessKangurSlugSegments(slug, session)) {
      notFound();
    }

    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const launchTarget = await getKangurConfiguredLaunchTarget(slug, resolvedSearchParams);
    if (launchTarget.href !== launchTarget.fallbackHref) {
      redirect(launchTarget.href);
    }

    return null;
  }
  const page = await resolveSlugToPage(slug);

  if (!page) {
    notFound();
  }

  const renderData = await loadSlugRenderData(page);
  return renderCmsPage(renderData);
}
