import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { JSX } from 'react';

import { getCmsRepository } from '@/features/cms/server';
import { getSlugsForDomain, resolveCmsDomainFromHeaders } from '@/features/cms/server';
import { getKangurConfiguredLaunchTarget } from '@/features/kangur/server/launch-route';
import { getFrontPagePublicOwner, getFrontPageRedirectPath } from '@/shared/lib/front-page-app';

import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from './home-helpers';
import { createHomeTimingRecorder } from './home-timing';
import { HomeContent } from './HomeContent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home(): Promise<JSX.Element | null> {
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
    return null;
  }

  const cmsRepository = await withTiming('cmsRepository', getCmsRepository);

  const hdrs = await withTiming('headers', () => headers());
  const domain = await withTiming('cmsDomain', () => resolveCmsDomainFromHeaders(hdrs));
  const slugs = await withTiming('cmsSlugs', () => getSlugsForDomain(domain.id, cmsRepository));

  const content = <HomeContent domainId={domain.id} slugs={slugs} withTiming={withTiming} />;

  await flush();
  return content;
}
