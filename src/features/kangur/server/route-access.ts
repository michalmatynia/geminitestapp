import { NextResponse } from 'next/server';
import { notFound } from 'next/navigation';

import {
  canAccessKangurPage,
  isSuperAdminOnlyKangurPage,
} from '@/features/kangur/config/page-access';
import { resolveKangurPageKeyFromSlug } from '@/features/kangur/config/routing';
import { readOptionalServerAuthSession } from '@/features/auth/server';

export { readSanitizedKangurAliasLoginSearchParams } from './login-alias-search-params';

const KANGUR_DENIED_API_HEADERS = Object.freeze({
  'Cache-Control': 'private, no-store',
});

export const readCanAccessKangurPage = async (
  pageKey: string | null | undefined
): Promise<boolean> => {
  if (!isSuperAdminOnlyKangurPage(pageKey)) {
    return true;
  }

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
  const pageKey = resolveKangurPageKeyFromSlug(slugSegments[0] ?? null);

  if (!isSuperAdminOnlyKangurPage(pageKey)) {
    return;
  }

  const session = await readOptionalServerAuthSession();

  if (!canAccessKangurPage(pageKey, session)) {
    notFound();
  }
};
