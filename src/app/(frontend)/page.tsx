import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { JSX } from 'react';

import { getCmsRepository } from '@/features/cms/server';
import { getSlugsForDomain, resolveCmsDomainFromHeaders } from '@/features/cms/server';
import { KangurPublicApp } from '@/features/kangur/ui/KangurPublicApp';
import { getFrontPagePublicOwner, getFrontPageRedirectPath } from '@/shared/lib/front-page-app';

import { HomeContent } from './HomeContent';
import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from './home-helpers';
import { createHomeTimingRecorder } from './home-timing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home(): Promise<JSX.Element> {
  const { withTiming, flush } = createHomeTimingRecorder();

  const shouldApplyFrontPageSelection = shouldApplyFrontPageAppSelection();
  const frontPageSetting = shouldApplyFrontPageSelection
    ? await withTiming('frontPageSetting', getFrontPageSetting)
    : null;
  const publicOwner = getFrontPagePublicOwner(frontPageSetting);
  const redirectPath = getFrontPageRedirectPath(frontPageSetting);

  if (shouldApplyFrontPageSelection && redirectPath) {
    await flush();
    redirect(redirectPath);
  }

  if (shouldApplyFrontPageSelection && publicOwner === 'kangur') {
    await flush();
    return <KangurPublicApp basePath='/' embedded />;
  }

  const cmsRepository = await withTiming('cmsRepository', getCmsRepository);

  const hdrs = await withTiming('headers', () => headers());
  const domain = await withTiming('cmsDomain', () => resolveCmsDomainFromHeaders(hdrs));
  const slugs = await withTiming('cmsSlugs', () => getSlugsForDomain(domain.id, cmsRepository));

  const content = <HomeContent domainId={domain.id} slugs={slugs} withTiming={withTiming} />;

  await flush();
  return content;
}
