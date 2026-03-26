'use client';

import { resolveAccessibleKangurPageKey } from '@/features/kangur/config/page-access';
import { useOptionalNextAuthSession } from '@/features/kangur/ui/hooks/useOptionalNextAuthSession';

export function useKangurAccessiblePageKey<TPageKey extends string>(
  pageKey: TPageKey | null | undefined,
  fallbackPageKey: TPageKey
): TPageKey {
  const { data: session } = useOptionalNextAuthSession();

  return resolveAccessibleKangurPageKey(pageKey, session, fallbackPageKey);
}
