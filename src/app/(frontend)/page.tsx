import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { JSX } from 'react';

import { getCmsRepository, isDomainZoningEnabled } from '@/features/cms/server';
import { getSlugsForDomain, resolveCmsDomainFromHeaders } from '@/features/cms/server';
import { getKangurConfiguredLaunchTarget } from '@/features/kangur/server/launch-route';
import { KangurSSRSkeleton } from '@/features/kangur/ui/KangurSSRSkeleton';
import { getFrontPagePublicOwner, getFrontPageRedirectPath } from '@/shared/lib/front-page-app';

import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from './home-helpers';
import { createHomeTimingRecorder } from './home-timing';
import { HomeContent } from './HomeContent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home(): Promise<JSX.Element | null> {
  const { withTiming, flush } = createHomeTimingRecorder();

  const shouldApplyFrontPageSelection = shouldApplyFrontPageAppSelection();
  const [frontPageSetting, kangurLaunchTargetEager] = shouldApplyFrontPageSelection
    ? await Promise.all([
        withTiming('frontPageSetting', getFrontPageSetting),
        withTiming('kangurLaunchTarget', () => getKangurConfiguredLaunchTarget()),
      ])
    : [null, null];
  const publicOwner = getFrontPagePublicOwner(frontPageSetting);
  const redirectPath = getFrontPageRedirectPath(frontPageSetting);
  const kangurLaunchTarget = publicOwner === 'kangur' ? kangurLaunchTargetEager : null;

  if (shouldApplyFrontPageSelection && redirectPath) {
    await flush();
    redirect(redirectPath);
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

  const [cmsRepository, hdrs] = await Promise.all([
    withTiming('cmsRepository', getCmsRepository),
    withTiming('headers', () => headers()),
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
