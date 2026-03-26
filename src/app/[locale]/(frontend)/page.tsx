import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { JSX } from 'react';

import { getCmsRepository } from '@/features/cms/server';
import { getSlugsForDomain, resolveCmsDomainFromHeaders } from '@/features/cms/server';
import { getKangurConfiguredLaunchTarget } from '@/features/kangur/server/launch-route';
import { KangurSSRSkeleton } from '@/features/kangur/ui/KangurSSRSkeleton';
import {
  buildLocalizedPathname,
  normalizeSiteLocale,
} from '@/shared/lib/i18n/site-locale';
import { getFrontPagePublicOwner, getFrontPageRedirectPath } from '@/shared/lib/front-page-app';

import { HomeContent } from '../../(frontend)/HomeContent';
import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from '../../(frontend)/home-helpers';
import { createHomeTimingRecorder } from '../../(frontend)/home-timing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type LocalizedHomeProps = {
  params: Promise<{ locale: string }>;
};

const localizePublicPath = (pathname: string, locale: string): string => {
  return pathname.startsWith('/admin') ? pathname : buildLocalizedPathname(pathname, locale);
};

export default async function LocalizedHome({
  params,
}: LocalizedHomeProps): Promise<JSX.Element | null> {
  const { locale } = await params;
  const resolvedLocale = normalizeSiteLocale(locale);
  const { withTiming, flush } = createHomeTimingRecorder();

  const shouldApplyFrontPageSelection = shouldApplyFrontPageAppSelection();
  const frontPageSetting = shouldApplyFrontPageSelection
    ? await withTiming('frontPageSetting', getFrontPageSetting)
    : null;
  const publicOwner = getFrontPagePublicOwner(frontPageSetting);
  const redirectPath = getFrontPageRedirectPath(frontPageSetting);
  const kangurLaunchTarget =
    shouldApplyFrontPageSelection && publicOwner === 'kangur'
      ? await withTiming('kangurLaunchTarget', () => getKangurConfiguredLaunchTarget())
      : null;

  if (shouldApplyFrontPageSelection && redirectPath) {
    await flush();
    redirect(localizePublicPath(redirectPath, resolvedLocale));
  }

  if (
    shouldApplyFrontPageSelection &&
    publicOwner === 'kangur' &&
    kangurLaunchTarget &&
    kangurLaunchTarget.href !== kangurLaunchTarget.fallbackHref
  ) {
    await flush();
    redirect(kangurLaunchTarget.href);
  }

  if (shouldApplyFrontPageSelection && publicOwner === 'kangur') {
    await flush();
    return <KangurSSRSkeleton />;
  }

  const cmsRepository = await withTiming('cmsRepository', getCmsRepository);

  const hdrs = await withTiming('headers', () => headers());
  const domain = await withTiming('cmsDomain', () => resolveCmsDomainFromHeaders(hdrs));
  const slugs = await withTiming('cmsSlugs', () =>
    getSlugsForDomain(domain.id, cmsRepository, { locale: resolvedLocale })
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
}
