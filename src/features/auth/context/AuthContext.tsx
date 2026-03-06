'use client';

import { useSession } from 'next-auth/react';
import React, { createContext, useContext, useMemo } from 'react';

import {
  AUTH_SETTINGS_KEYS,
  DEFAULT_AUTH_PERMISSIONS,
  DEFAULT_AUTH_ROLES,
  mergeDefaultRoles,
  type AuthPermission,
  type AuthRole,
  type AuthUserRoleMap,
} from '@/features/auth/utils/auth-management';
import {
  DEFAULT_AUTH_SECURITY_POLICY,
  normalizeAuthSecurityPolicy,
  type AuthSecurityPolicy,
} from '@/features/auth/utils/auth-security';
import {
  DEFAULT_AUTH_USER_PAGE_SETTINGS,
  type AuthUserPageSettings,
} from '@/features/auth/utils/auth-user-pages';
import { internalError } from '@/shared/errors/app-error';
import { useLiteSettingsMap, useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import type { Session } from 'next-auth';

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
type AuthSettingsQueryState = {
  data: Map<string, string> | undefined;
  isPending: boolean;
  refetch: () => Promise<unknown>;
};

const useAuthContextValue = ({
  session,
  status,
  settingsQuery,
  updateSetting,
  isPublicMode,
}: {
  session: Session | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  settingsQuery: AuthSettingsQueryState;
  updateSetting: ReturnType<typeof useUpdateSetting>;
  isPublicMode: boolean;
}): AuthContextValue => {
  const permissions = useMemo(() => session?.user?.permissions ?? [], [session]);
  const isElevated = useMemo(() => Boolean(session?.user?.isElevated), [session]);

  const canReadUsers = useMemo(
    () => Boolean(isElevated || permissions.includes('auth.users.read')),
    [isElevated, permissions]
  );

  const canManageSecurity = useMemo(
    () => Boolean(isElevated || permissions.includes('auth.users.write')),
    [isElevated, permissions]
  );

  const roles = useMemo(() => {
    if (!settingsQuery.data) return DEFAULT_AUTH_ROLES;
    return mergeDefaultRoles(
      parseJsonSetting<AuthRole[]>(
        settingsQuery.data.get(AUTH_SETTINGS_KEYS.roles),
        DEFAULT_AUTH_ROLES
      )
    );
  }, [settingsQuery.data]);

  const permissionsLibrary = useMemo(() => {
    if (!settingsQuery.data) return DEFAULT_AUTH_PERMISSIONS;
    return parseJsonSetting<AuthPermission[]>(
      settingsQuery.data.get(AUTH_SETTINGS_KEYS.permissions),
      DEFAULT_AUTH_PERMISSIONS
    );
  }, [settingsQuery.data]);

  const userRoles = useMemo(() => {
    if (!settingsQuery.data) return {};
    return parseJsonSetting<AuthUserRoleMap>(
      settingsQuery.data.get(AUTH_SETTINGS_KEYS.userRoles),
      {}
    );
  }, [settingsQuery.data]);

  const defaultRole = useMemo(() => {
    if (!settingsQuery.data) return 'viewer';
    const storedDefault = settingsQuery.data.get(AUTH_SETTINGS_KEYS.defaultRole);
    return storedDefault && roles.some((role) => role.id === storedDefault)
      ? storedDefault
      : (roles.find((role) => role.id === 'viewer')?.id ?? roles[0]?.id ?? 'viewer');
  }, [settingsQuery.data, roles]);

  const securityPolicy = useMemo(() => {
    if (!settingsQuery.data) return DEFAULT_AUTH_SECURITY_POLICY;
    const storedPolicyRaw = settingsQuery.data.get(AUTH_SETTINGS_KEYS.securityPolicy);
    const parsedPolicy = storedPolicyRaw
      ? normalizeAuthSecurityPolicy(
          parseJsonSetting<Partial<AuthSecurityPolicy>>(
            storedPolicyRaw,
            DEFAULT_AUTH_SECURITY_POLICY
          )
        )
      : DEFAULT_AUTH_SECURITY_POLICY;
    return parsedPolicy;
  }, [settingsQuery.data]);

  const userPageSettings = useMemo(() => {
    if (!settingsQuery.data) return DEFAULT_AUTH_USER_PAGE_SETTINGS;
    return parseJsonSetting<AuthUserPageSettings>(
      settingsQuery.data.get(AUTH_SETTINGS_KEYS.userPages),
      DEFAULT_AUTH_USER_PAGE_SETTINGS
    );
  }, [settingsQuery.data]);

  const isLoading = isPublicMode
    ? settingsQuery.isPending
    : status === 'loading' || settingsQuery.isPending;

  const value = useMemo(
    () => ({
      session,
      status,
      permissions,
      isElevated,
      canReadUsers,
      canManageSecurity,
      roles,
      permissionsLibrary,
      userRoles,
      defaultRole,
      securityPolicy,
      userPageSettings,
      isLoading,
      updateSetting,
      refetchSettings: settingsQuery.refetch,
    }),
    [
      session,
      status,
      permissions,
      isElevated,
      canReadUsers,
      canManageSecurity,
      roles,
      permissionsLibrary,
      userRoles,
      defaultRole,
      securityPolicy,
      userPageSettings,
      isLoading,
      updateSetting,
      settingsQuery.refetch,
    ]
  );

  return value;
};

const FullAuthProvider = ({ children }: { children: React.ReactNode }): React.JSX.Element => {
  const { data: session, status } = useSession();
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const updateSetting = useUpdateSetting();
  const value = useAuthContextValue({
    session,
    status,
    settingsQuery,
    updateSetting,
    isPublicMode: false,
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
