'use client';

import { useSession } from 'next-auth/react';

import { resolveAccessibleKangurPageKey } from '@/features/kangur/config/page-access';

export function useKangurAccessiblePageKey<TPageKey extends string>(
  pageKey: TPageKey | null | undefined,
  fallbackPageKey: TPageKey
): TPageKey {
  const { data: session } = useSession();

  return resolveAccessibleKangurPageKey(pageKey, session, fallbackPageKey);
}
