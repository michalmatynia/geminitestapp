import 'server-only';

import { redirect } from 'next/navigation';
import { JSX } from 'react';

import { getCmsRepository, getSlugsForDomain, isDomainZoningEnabled, resolveCmsDomainFromHeaders } from '@/features/cms/server';
import { getKangurPublicLaunchHref } from '@/features/kangur/public';
import { getKangurConfiguredLaunchRoute } from '@/features/kangur/server';
import { buildLocalizedPathname, normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import { getFrontPagePublicOwner, getFrontPageRedirectPath } from '@/shared/lib/front-page-app';
import { readOptionalRequestHeaders } from '@/shared/lib/request/optional-headers';

import { HomeContent } from '../home/HomeContent';
import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from '../home/home-helpers';
import { createHomeTimingRecorder } from '../home/home-timing';

type RenderHomeRouteOptions = {
  locale?: string | null;
};

const localizePublicPath = (pathname: string, locale?: string): string => {
  if (!locale || pathname.startsWith('/admin')) {
    return pathname;
  }

  return buildLocalizedPathname(pathname, locale);
};

const resolveHomeLocale = (locale?: string | null): string | undefined =>
  typeof locale === 'string' ? normalizeSiteLocale(locale) : undefined;

export const renderHomeRoute = async ({
  locale,
}: RenderHomeRouteOptions = {}): Promise<JSX.Element | null> => {
  const resolvedLocale = resolveHomeLocale(locale);
  const { withTiming, flush } = createHomeTimingRecorder();

  const shouldApplyFrontPageSelection = shouldApplyFrontPageAppSelection();
  const frontPageSetting = shouldApplyFrontPageSelection
    ? await withTiming('frontPageSetting', getFrontPageSetting)
    : null;
  const publicOwner = getFrontPagePublicOwner(frontPageSetting);
  const redirectPath = getFrontPageRedirectPath(frontPageSetting);
  const kangurLaunchRoute =
    shouldApplyFrontPageSelection && publicOwner === 'kangur'
      ? await withTiming('kangurLaunchRoute', () => getKangurConfiguredLaunchRoute())
      : null;

  if (shouldApplyFrontPageSelection && redirectPath) {
    await flush();
    redirect(localizePublicPath(redirectPath, resolvedLocale));
  }

  if (shouldApplyFrontPageSelection && publicOwner === 'kangur') {
    await flush();
    redirect(localizePublicPath(getKangurPublicLaunchHref(kangurLaunchRoute ?? undefined), resolvedLocale));
  }

  const [cmsRepository, hdrs] = await Promise.all([
    withTiming('cmsRepository', getCmsRepository),
    withTiming('headers', readOptionalRequestHeaders),
    isDomainZoningEnabled(),
  ]);
  const domain = await withTiming('cmsDomain', () => resolveCmsDomainFromHeaders(hdrs));
  const slugs = await withTiming('cmsSlugs', () =>
    getSlugsForDomain(domain.id, cmsRepository, resolvedLocale ? { locale: resolvedLocale } : undefined)
  );

  const content = (
    <HomeContent
      domainId={domain.id}
      slugs={slugs}
      withTiming={withTiming}
      locale={resolvedLocale}
    />
  );

  await flush();
  return content;
};
