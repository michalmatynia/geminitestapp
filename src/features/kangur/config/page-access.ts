import type { Session } from 'next-auth';

import { isSuperAdminSession } from '@/shared/lib/auth/elevated-session-user';

const SUPER_ADMIN_ONLY_KANGUR_PAGE_KEYS = new Set(['GamesLibrary']);

export const isSuperAdminOnlyKangurPage = (
  pageKey: string | null | undefined
): boolean => {
  const normalizedPageKey = pageKey?.trim();
  return normalizedPageKey ? SUPER_ADMIN_ONLY_KANGUR_PAGE_KEYS.has(normalizedPageKey) : false;
};

export const canAccessKangurPage = (
  pageKey: string | null | undefined,
  session: Session | null | undefined
): boolean => !isSuperAdminOnlyKangurPage(pageKey) || isSuperAdminSession(session);

export const resolveAccessibleKangurPageKey = <TPageKey extends string>(
  pageKey: TPageKey | null | undefined,
  session: Session | null | undefined,
  fallbackPageKey: TPageKey
): TPageKey => {
  const normalizedPageKey = pageKey?.trim() as TPageKey | undefined;
  if (!normalizedPageKey) {
    return fallbackPageKey;
  }

  return canAccessKangurPage(normalizedPageKey, session)
    ? normalizedPageKey
    : fallbackPageKey;
};
