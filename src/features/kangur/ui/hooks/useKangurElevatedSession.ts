'use client';

import { useMemo } from 'react';

import {
  getElevatedSessionUserSnapshot,
  isSuperAdminSession,
  type ElevatedSessionUserSnapshot,
} from '@/shared/lib/auth/elevated-session-user';

import { useOptionalNextAuthSession } from './useOptionalNextAuthSession';

export const useKangurElevatedSession = (): {
  elevatedUser: ElevatedSessionUserSnapshot | null;
  isSuperAdmin: boolean;
  status: ReturnType<typeof useOptionalNextAuthSession>['status'];
} => {
  const { data: session, status } = useOptionalNextAuthSession();

  const elevatedUser = useMemo(() => getElevatedSessionUserSnapshot(session), [session]);
  const isSuperAdmin = useMemo(() => isSuperAdminSession(session), [session]);

  return {
    elevatedUser,
    isSuperAdmin,
    status,
  };
};
