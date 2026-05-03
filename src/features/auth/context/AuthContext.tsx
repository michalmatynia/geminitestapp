'use client';

import { useSession } from 'next-auth/react';
import React, { createContext, useContext, useMemo } from 'react';

import { useAuthRoleSettings } from '@/features/auth/hooks/useAuthQueries';
import { useAuthComputedState } from '@/features/auth/hooks/useAuthComputedState';
import { internalError } from '@/shared/errors/app-error';
import { useLiteSettingsMap, useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';

import type { Session } from 'next-auth';
import type { AuthRole, AuthPermission, AuthUserRoleMap } from '@/features/auth/utils/auth-management';
import type { AuthSecurityPolicy } from '@/features/auth/utils/auth-security';
import type { AuthUserPageSettings } from '@/features/auth/utils/auth-user-pages';

interface AuthContextValue {
  session: Session | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  permissions: string[];
  isElevated: boolean;
  canReadUsers: boolean;
  canManageSecurity: boolean;
  roles: AuthRole[];
  permissionsLibrary: AuthPermission[];
  userRoles: AuthUserRoleMap;
  defaultRole: string;
  securityPolicy: AuthSecurityPolicy;
  userPageSettings: AuthUserPageSettings;
  isLoading: boolean;
  updateSetting: ReturnType<typeof useUpdateSetting>;
  refetchSettings: () => Promise<unknown>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderMode = 'full' | 'public';

const useAuthContextValue = ({
  session,
  status,
  settingsQuery,
  updateSetting,
  isPublicMode,
  roleSettingsQuery,
}: {
  session: Session | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  settingsQuery: { data: Map<string, string> | undefined; isPending: boolean; refetch: () => Promise<unknown> };
  updateSetting: ReturnType<typeof useUpdateSetting>;
  isPublicMode: boolean;
  roleSettingsQuery: { data: any; isPending: boolean; isSuccess: boolean; refetch: () => Promise<unknown> } | null;
}): AuthContextValue => {
  const computed = useAuthComputedState({
    session,
    settingsQueryData: settingsQuery.data,
    roleSettingsQuery,
  });

  const isLoading = isPublicMode
    ? settingsQuery.isPending
    : status === 'loading' || settingsQuery.isPending || (roleSettingsQuery?.isPending === true);

  return useMemo(
    () => ({
      ...computed,
      session,
      status,
      isLoading,
      updateSetting,
      refetchSettings: async () => {
        if (roleSettingsQuery !== null) {
          void roleSettingsQuery.refetch();
        }
        return settingsQuery.refetch();
      },
    }),
    [computed, session, status, isLoading, updateSetting, roleSettingsQuery, settingsQuery]
  );
};

const FullAuthProvider = ({ children }: { children: React.ReactNode }): React.JSX.Element => {
  const { data: session, status } = useSession();
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const updateSetting = useUpdateSetting();
  const hasRoleSettingsAccess = session?.user !== undefined && (
    session.user.isElevated === true ||
    session.user.permissions?.includes('auth.users.read') === true ||
    session.user.permissions?.includes('auth.users.write') === true
  );
  const roleSettingsQuery = useAuthRoleSettings(hasRoleSettingsAccess);
  const value = useAuthContextValue({
    session,
    status,
    settingsQuery,
    updateSetting,
    isPublicMode: false,
    roleSettingsQuery,
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const PublicAuthProvider = ({ children }: { children: React.ReactNode }): React.JSX.Element => {
  const settingsQuery = useLiteSettingsMap();
  const updateSetting = useUpdateSetting();
  const value = useAuthContextValue({
    session: null,
    status: 'unauthenticated',
    settingsQuery,
    updateSetting,
    isPublicMode: true,
    roleSettingsQuery: null,
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function AuthProvider({
  children,
  mode = 'full',
}: {
  children: React.ReactNode;
  mode?: AuthProviderMode;
}): React.JSX.Element {
  if (mode === 'public') {
    return <PublicAuthProvider>{children}</PublicAuthProvider>;
  }
  return <FullAuthProvider>{children}</FullAuthProvider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw internalError('useAuth must be used within an AuthProvider');
  }
  return context;
}
