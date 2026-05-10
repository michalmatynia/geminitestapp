import { useMemo } from 'react';
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
import { parseJsonSetting } from '@/shared/utils/settings-json';
import { type Session } from 'next-auth';
import { type AuthRoleSettings } from '@/shared/contracts/auth';

type AuthRoleSettingsQuery = { data: AuthRoleSettings | undefined; isSuccess: boolean } | null;

interface AuthComputedStateInput {
  session: Session | null;
  settingsQueryData: Map<string, string> | undefined;
  roleSettingsQuery: AuthRoleSettingsQuery;
}

const useAuthBasicInfo = (session: Session | null): {
  permissions: string[];
  isElevated: boolean;
  canReadUsers: boolean;
  canManageSecurity: boolean;
} => {
  const permissions = useMemo(() => session?.user?.permissions ?? [], [session]);
  const isElevated = useMemo(() => session?.user?.isElevated === true, [session]);

  const canReadUsers = useMemo(
    () => isElevated || permissions.includes('auth.users.read'),
    [isElevated, permissions]
  );

  const canManageSecurity = useMemo(
    () => isElevated || permissions.includes('auth.users.write'),
    [isElevated, permissions]
  );

  return { permissions, isElevated, canReadUsers, canManageSecurity };
};

const useAuthRolesList = (
  settingsQueryData: Map<string, string> | undefined,
  roleSettingsQuery: AuthRoleSettingsQuery
): AuthRole[] => {
  return useMemo(() => {
    if (roleSettingsQuery?.isSuccess === true) {
      const roles = roleSettingsQuery.data?.roles;
      if (Array.isArray(roles) && roles.length > 0) return roles;
    }
    if (settingsQueryData === undefined) return DEFAULT_AUTH_ROLES;
    const stored = settingsQueryData.get(AUTH_SETTINGS_KEYS.roles);
    return mergeDefaultRoles(parseJsonSetting<AuthRole[]>(stored, DEFAULT_AUTH_ROLES));
  }, [roleSettingsQuery?.data, roleSettingsQuery?.isSuccess, settingsQueryData]);
};

const resolveStoredDefaultRole = (
  settingsQueryData: Map<string, string> | undefined,
  roleSettingsQuery: AuthRoleSettingsQuery
): string | null => {
  if (roleSettingsQuery?.isSuccess === true) {
    return roleSettingsQuery.data?.defaultRoleId ?? null;
  }
  return settingsQueryData?.get(AUTH_SETTINGS_KEYS.defaultRole) ?? null;
};

const resolveFallbackRoleId = (roles: AuthRole[]): string =>
  roles.find((role) => role.id === 'viewer')?.id ?? roles[0]?.id ?? 'viewer';

const useAuthSecurityPolicy = (settingsQueryData: Map<string, string> | undefined): AuthSecurityPolicy => {
  return useMemo(() => {
    if (settingsQueryData === undefined) return DEFAULT_AUTH_SECURITY_POLICY;
    const storedPolicyRaw = settingsQueryData.get(AUTH_SETTINGS_KEYS.securityPolicy);
    if (storedPolicyRaw === undefined || storedPolicyRaw === '') return DEFAULT_AUTH_SECURITY_POLICY;
    
    return normalizeAuthSecurityPolicy(
      parseJsonSetting<Partial<AuthSecurityPolicy>>(
        storedPolicyRaw,
        DEFAULT_AUTH_SECURITY_POLICY
      )
    );
  }, [settingsQueryData]);
};

const useAuthUserPageSettings = (settingsQueryData: Map<string, string> | undefined): AuthUserPageSettings => {
  return useMemo(() => {
    if (settingsQueryData === undefined) return DEFAULT_AUTH_USER_PAGE_SETTINGS;
    return parseJsonSetting<AuthUserPageSettings>(
      settingsQueryData.get(AUTH_SETTINGS_KEYS.userPages),
      DEFAULT_AUTH_USER_PAGE_SETTINGS
    );
  }, [settingsQueryData]);
};

export const useAuthComputedState = ({
  session,
  settingsQueryData,
  roleSettingsQuery,
}: AuthComputedStateInput): {
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
} => {
  const basicInfo = useAuthBasicInfo(session);
  const roles = useAuthRolesList(settingsQueryData, roleSettingsQuery);

  const permissionsLibrary = useMemo((): AuthPermission[] => {
    if (roleSettingsQuery?.isSuccess === true) {
      const lib = roleSettingsQuery.data?.permissions;
      if (Array.isArray(lib) && lib.length > 0) return lib;
    }
    if (settingsQueryData === undefined) return DEFAULT_AUTH_PERMISSIONS;
    const stored = settingsQueryData.get(AUTH_SETTINGS_KEYS.permissions);
    return parseJsonSetting<AuthPermission[]>(stored, DEFAULT_AUTH_PERMISSIONS);
  }, [roleSettingsQuery?.data, roleSettingsQuery?.isSuccess, settingsQueryData]);

  const userRoles = useMemo((): AuthUserRoleMap => {
    if (roleSettingsQuery?.isSuccess === true) {
      return roleSettingsQuery.data?.userRoles ?? {};
    }
    if (settingsQueryData === undefined) return {};
    const stored = settingsQueryData.get(AUTH_SETTINGS_KEYS.userRoles);
    return parseJsonSetting<AuthUserRoleMap>(stored, {});
  }, [roleSettingsQuery?.data, roleSettingsQuery?.isSuccess, settingsQueryData]);

  const defaultRole = useMemo((): string => {
    const storedDefault = resolveStoredDefaultRole(settingsQueryData, roleSettingsQuery);
    if (storedDefault !== null && roles.some((role) => role.id === storedDefault)) {
      return storedDefault;
    }
    return resolveFallbackRoleId(roles);
  }, [roleSettingsQuery?.data, roleSettingsQuery?.isSuccess, roles, settingsQueryData]);

  const securityPolicy = useAuthSecurityPolicy(settingsQueryData);
  const userPageSettings = useAuthUserPageSettings(settingsQueryData);

  return {
    ...basicInfo,
    roles,
    permissionsLibrary,
    userRoles,
    defaultRole,
    securityPolicy,
    userPageSettings,
  };
};
