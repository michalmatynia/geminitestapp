import { NextResponse } from 'next/server';
import { notFound } from 'next/navigation';

import { canAccessKangurPage, canAccessKangurSlugSegments } from '@/features/kangur/config/page-access';
import { readOptionalServerAuthSession } from '@/shared/lib/auth/optional-server-auth';

export { readSanitizedKangurAliasLoginSearchParams } from './login-alias-search-params';

const KANGUR_DENIED_API_HEADERS = Object.freeze({
  'Cache-Control': 'private, no-store',
});

export const readCanAccessKangurPage = async (
  pageKey: string | null | undefined
): Promise<boolean> => {
  const session = await readOptionalServerAuthSession();
  return canAccessKangurPage(pageKey, session);
};

export const createKangurDeniedApiResponse = (): Response =>
  NextResponse.json(
    {
      error: 'Not Found',
    },
    {
      headers: KANGUR_DENIED_API_HEADERS,
      status: 404,
    }
  );

export const requireAccessibleKangurSlugRoute = async (
  slugSegments: readonly string[]
): Promise<void> => {
  const session = await readOptionalServerAuthSession();

  if (!canAccessKangurSlugSegments(slugSegments, session)) {
    notFound();
  }
};
