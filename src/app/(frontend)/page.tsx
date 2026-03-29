import { redirect } from 'next/navigation';
import { JSX } from 'react';

import { getCmsRepository, isDomainZoningEnabled } from '@/features/cms/server';
import { getSlugsForDomain, resolveCmsDomainFromHeaders } from '@/features/cms/server';
import { getKangurPublicLaunchHref } from '@/features/kangur/config/routing';
import { getKangurConfiguredLaunchRoute } from '@/features/kangur/server';
import { getFrontPagePublicOwner, getFrontPageRedirectPath } from '@/shared/lib/front-page-app';
import { readOptionalRequestHeaders } from '@/shared/lib/request/optional-headers';

import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from './home-helpers';
import { createHomeTimingRecorder } from './home-timing';
import { HomeContent } from './HomeContent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home(): Promise<JSX.Element | null> {
  const { withTiming, flush } = createHomeTimingRecorder();

  const shouldApplyFrontPageSelection = shouldApplyFrontPageAppSelection();
  const [frontPageSetting, kangurLaunchRoute] = shouldApplyFrontPageSelection
    ? await Promise.all([
        withTiming('frontPageSetting', getFrontPageSetting),
        withTiming('kangurLaunchRoute', () => getKangurConfiguredLaunchRoute()),
      ])
    : [null, null];
  const publicOwner = getFrontPagePublicOwner(frontPageSetting);
  const redirectPath = getFrontPageRedirectPath(frontPageSetting);

  if (shouldApplyFrontPageSelection && redirectPath) {
    await flush();
    redirect(redirectPath);
  }

  if (shouldApplyFrontPageSelection && publicOwner === 'kangur') {
    await flush();
    redirect(getKangurPublicLaunchHref(kangurLaunchRoute ?? undefined));
  }

  const [cmsRepository, hdrs] = await Promise.all([
    withTiming('cmsRepository', getCmsRepository),
    withTiming('headers', readOptionalRequestHeaders),
    // Warm the isDomainZoningEnabled cache() so that resolveCmsDomainFromHeaders
    // and getSlugsForDomain find it already resolved instead of awaiting it.
    isDomainZoningEnabled(),
  ]);
  const domain = await withTiming('cmsDomain', () => resolveCmsDomainFromHeaders(hdrs));
  const slugs = await withTiming('cmsSlugs', () => getSlugsForDomain(domain.id, cmsRepository));

  const content = <HomeContent domainId={domain.id} slugs={slugs} withTiming={withTiming} />;

  await flush();
  return content;
}
