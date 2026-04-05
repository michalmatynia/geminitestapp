'use client';

import { useMemo } from 'react';

import { canAccessKangurPage } from '@/features/kangur/config/page-access';
import { useOptionalNextAuthSession } from '@/features/kangur/ui/hooks/useOptionalNextAuthSession';

export const useKangurPageAccess = (
  pageKey: string | null | undefined
): {
  canAccess: boolean;
  status: ReturnType<typeof useOptionalNextAuthSession>['status'];
} => {
  const { data: session, status } = useOptionalNextAuthSession();

  const canAccess = useMemo(() => canAccessKangurPage(pageKey, session), [pageKey, session]);

  return {
    canAccess,
    status,
  };
};
