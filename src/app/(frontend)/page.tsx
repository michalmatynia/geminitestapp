import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { JSX } from 'react';

import { getCmsRepository } from '@/features/cms/services/cms-repository';
import { getSlugsForDomain, resolveCmsDomainFromHeaders } from '@/features/cms/services/cms-domain';

import { HomeContent } from './HomeContent';
import {
  FRONT_PAGE_ALLOWED,
  getFrontPageSetting,
  shouldUseFrontPageAppRedirect,
} from './home-helpers';
import { createHomeTimingRecorder } from './home-timing';

export const revalidate = 3600;

export default async function Home(): Promise<JSX.Element> {
  const { withTiming, flush } = createHomeTimingRecorder();

  const frontPageRedirectEnabled = shouldUseFrontPageAppRedirect();
  const [cmsRepository, frontPageApp] = await Promise.all([
    withTiming('cmsRepository', getCmsRepository),
    frontPageRedirectEnabled
      ? withTiming('frontPageSetting', getFrontPageSetting)
      : Promise.resolve<string | null>(null),
  ]);

  if (frontPageRedirectEnabled && frontPageApp && FRONT_PAGE_ALLOWED.has(frontPageApp)) {
    if (frontPageApp === 'chatbot') {
      redirect('/admin/chatbot');
    }
    if (frontPageApp === 'notes') {
      redirect('/admin/notes');
    }
  }

  const hdrs = await withTiming('headers', () => headers());
  const domain = await withTiming('cmsDomain', () => resolveCmsDomainFromHeaders(hdrs));
  const slugs = await withTiming('cmsSlugs', () => getSlugsForDomain(domain.id, cmsRepository));

  const content = <HomeContent domainId={domain.id} slugs={slugs} withTiming={withTiming} />;

  await flush();
  return content;
}
