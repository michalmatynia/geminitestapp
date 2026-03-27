import { notFound, redirect } from 'next/navigation';

import { auth } from '@/features/auth/server';
import { canAccessKangurSlugSegments } from '@/features/kangur/config/page-access';
import { getKangurCanonicalPublicHref } from '@/features/kangur/config/routing';
import { KangurServerShell } from '@/features/kangur/ui/components/KangurServerShell';
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';

import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from '../../../home-helpers';

type KangurAliasPageProps = {
  params: Promise<{ slug?: string[] }>;
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
  params,
  searchParams,
}: KangurAliasPageProps): Promise<React.JSX.Element | null> {
  const { slug = [] } = await params;
  if (shouldApplyFrontPageAppSelection()) {
    const frontPageSetting = await getFrontPageSetting();

    if (getFrontPagePublicOwner(frontPageSetting) === 'kangur') {
      const session = await readOptionalAuthSession();
      if (!canAccessKangurSlugSegments(slug, session)) {
        notFound();
      }
      const resolvedSearchParams = searchParams ? await searchParams : undefined;
      redirect(getKangurCanonicalPublicHref(slug, resolvedSearchParams));
    }
  }

  return <KangurServerShell />;
}
