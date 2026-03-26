import 'server-only';

import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { JSX } from 'react';

import { renderCmsPage } from '@/app/(frontend)/cms-render';
import {
  buildSlugMetadata,
  loadSlugRenderData,
  resolveSlugToPage,
} from '@/app/(frontend)/[...slug]/slug-page-data';
import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from '@/app/(frontend)/home-helpers';
import { getKangurStorefrontInitialState } from '@/features/kangur/server/storefront-appearance';
import { FrontendPublicOwnerKangurShell } from '@/features/kangur/ui/FrontendPublicOwnerKangurShell';
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

import type { Metadata } from 'next';

type CanonicalLoginRouteOptions = {
  locale?: string | null;
};

const LOGIN_SLUG = ['login'];

const resolveCanonicalLoginPublicOwner = async (): Promise<'cms' | 'kangur'> => {
  if (!shouldApplyFrontPageAppSelection()) {
    return 'cms';
  }

  const frontPageSetting = await getFrontPageSetting();
  return getFrontPagePublicOwner(frontPageSetting);
};

const resolveCanonicalLoginLocale = (locale?: string | null): string | undefined => {
  if (typeof locale !== 'string') {
    return undefined;
  }

  return normalizeSiteLocale(locale);
};

export const generateCanonicalLoginMetadata = async ({
  locale,
}: CanonicalLoginRouteOptions = {}): Promise<Metadata> => {
  const resolvedLocale = resolveCanonicalLoginLocale(locale);
  const routeTranslations = resolvedLocale
    ? await getTranslations({ locale: resolvedLocale, namespace: 'Routes' })
    : await getTranslations('Routes');
  const publicOwner = await resolveCanonicalLoginPublicOwner();

  if (publicOwner === 'kangur') {
    return {
      title: routeTranslations('loginTitle'),
    };
  }

  const page = await resolveSlugToPage(LOGIN_SLUG, resolvedLocale ? { locale: resolvedLocale } : undefined);
  if (!page) {
    return {
      title: routeTranslations('pageNotFoundTitle'),
    };
  }

  return buildSlugMetadata(page);
};

export const renderCanonicalLoginRoute = async ({
  locale,
}: CanonicalLoginRouteOptions = {}): Promise<JSX.Element> => {
  const resolvedLocale = resolveCanonicalLoginLocale(locale);
  const publicOwner = await resolveCanonicalLoginPublicOwner();

  if (publicOwner === 'kangur') {
    const kangurInitialState = await getKangurStorefrontInitialState();
    return (
      <FrontendPublicOwnerKangurShell
        embeddedOverride={false}
        initialAppearance={{
          mode: kangurInitialState.initialMode,
          themeSettings: kangurInitialState.initialThemeSettings,
        }}
      />
    );
  }

  const page = await resolveSlugToPage(LOGIN_SLUG, resolvedLocale ? { locale: resolvedLocale } : undefined);
  if (!page) {
    notFound();
  }

  const renderData = await loadSlugRenderData(
    page,
    resolvedLocale ? { locale: resolvedLocale } : undefined
  );
  return renderCmsPage(renderData);
};
