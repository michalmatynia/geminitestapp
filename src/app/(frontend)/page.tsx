import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { JSX } from 'react';

import { getCmsRepository } from '@/features/cms/server';
import { getSlugsForDomain, resolveCmsDomainFromHeaders } from '@/features/cms/server';
import { KANGUR_BASE_PATH } from '@/features/kangur/config/routing';

import { HomeContent } from './HomeContent';
import {
  FRONT_PAGE_ALLOWED,
  getFrontPageSetting,
  shouldUseFrontPageAppRedirect,
} from './home-helpers';
import { createHomeTimingRecorder } from './home-timing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home(): Promise<JSX.Element> {
  const { withTiming, flush } = createHomeTimingRecorder();

  const frontPageRedirectEnabled = shouldUseFrontPageAppRedirect();
  const frontPageApp = frontPageRedirectEnabled
    ? await withTiming('frontPageSetting', getFrontPageSetting)
    : null;

  if (frontPageRedirectEnabled && frontPageApp && FRONT_PAGE_ALLOWED.has(frontPageApp)) {
    if (frontPageApp === 'kangur') {
      redirect(KANGUR_BASE_PATH);
    }
    if (frontPageApp === 'chatbot') {
      redirect('/admin/chatbot');
    }
    if (frontPageApp === 'notes') {
      redirect('/admin/notes');
    }
  }

  const cmsRepository = await withTiming('cmsRepository', getCmsRepository);

  const hdrs = await withTiming('headers', () => headers());
  const domain = await withTiming('cmsDomain', () => resolveCmsDomainFromHeaders(hdrs));
  const slugs = await withTiming('cmsSlugs', () => getSlugsForDomain(domain.id, cmsRepository));

  const content = <HomeContent domainId={domain.id} slugs={slugs} withTiming={withTiming} />;

  await flush();
  return content;
}
