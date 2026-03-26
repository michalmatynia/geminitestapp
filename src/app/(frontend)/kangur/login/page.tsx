import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Suspense, type JSX } from 'react';

import { auth } from '@/features/auth/server';
import { getKangurCanonicalPublicHref, getKangurHomeHref } from '@/features/kangur/config/routing';
import { KangurFeatureRouteShell } from '@/features/kangur/ui/KangurFeatureRouteShell';
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';

import { sanitizeKangurAliasLoginSearchParams } from './alias-search-params';
import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from '../../home-helpers';

type KangurAliasLoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const isMissingRequestScopeError = (error: unknown): boolean =>
  error instanceof Error && error.message.includes('outside a request scope');

const readOptionalAuthSession = async () => {
  try {
    return await auth();
  } catch (error) {
    if (isMissingRequestScopeError(error)) {
      return null;
    }
    throw error;
  }
};

export default async function Page({
  searchParams,
}: KangurAliasLoginPageProps): Promise<JSX.Element> {
  const translations = await getTranslations('KangurPublic');
  const shouldRedirectToCanonical = shouldApplyFrontPageAppSelection();

  if (shouldRedirectToCanonical) {
    const frontPageSetting = await getFrontPageSetting();

    if (getFrontPagePublicOwner(frontPageSetting) === 'kangur') {
      const session = await readOptionalAuthSession();
      const resolvedSearchParams = sanitizeKangurAliasLoginSearchParams({
        searchParams: searchParams ? await searchParams : undefined,
        pathname: '/kangur/login',
        fallbackHref: getKangurHomeHref('/'),
        session,
      });
      redirect(getKangurCanonicalPublicHref(['login'], resolvedSearchParams));
    }
  }

  return (
    <Suspense fallback={<div className='sr-only'>{translations('routeLoading')}</div>}>
      <KangurFeatureRouteShell />
    </Suspense>
  );
}
