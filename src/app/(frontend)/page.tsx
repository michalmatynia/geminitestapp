import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { JSX } from 'react';

import { getCmsRepository } from '@/features/cms/server';
import { getSlugsForDomain, resolveCmsDomainFromHeaders } from '@/features/cms/server';
import { getFrontPageRedirectPath } from '@/shared/lib/front-page-app';

import { HomeContent } from './HomeContent';
import { getFrontPageSetting, shouldUseFrontPageAppRedirect } from './home-helpers';
import { createHomeTimingRecorder } from './home-timing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home(): Promise<JSX.Element> {
  const { withTiming, flush } = createHomeTimingRecorder();

  const frontPageRedirectEnabled = shouldUseFrontPageAppRedirect();
  const frontPageSetting = frontPageRedirectEnabled
    ? await withTiming('frontPageSetting', getFrontPageSetting)
    : null;
  const redirectPath = getFrontPageRedirectPath(frontPageSetting);

  if (frontPageRedirectEnabled && redirectPath) {
    await flush();
    redirect(redirectPath);
  }

  const cmsRepository = await withTiming('cmsRepository', getCmsRepository);

  const hdrs = await withTiming('headers', () => headers());
  const domain = await withTiming('cmsDomain', () => resolveCmsDomainFromHeaders(hdrs));
  const slugs = await withTiming('cmsSlugs', () => getSlugsForDomain(domain.id, cmsRepository));

  const content = <HomeContent domainId={domain.id} slugs={slugs} withTiming={withTiming} />;

  await flush();
  return content;
}
