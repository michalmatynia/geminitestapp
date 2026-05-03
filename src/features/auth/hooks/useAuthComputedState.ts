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

interface AuthComputedStateInput {
  session: Session | null;
  settingsQueryData: Map<string, string> | undefined;
  roleSettingsQuery: { data: AuthRoleSettings | undefined; isSuccess: boolean } | null;
}

const useAuthBasicInfo = (session: Session | null) => {
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
  roleSettingsQuery: { data: AuthRoleSettings | undefined; isSuccess: boolean } | null
) => {
  return useMemo(() => {
    if (roleSettingsQuery?.isSuccess === true && (roleSettingsQuery.data?.roles?.length ?? 0) > 0) {
      return roleSettingsQuery.data?.roles ?? DEFAULT_AUTH_ROLES;
    }
    if (settingsQueryData === undefined) return DEFAULT_AUTH_ROLES;
    return mergeDefaultRoles(
      parseJsonSetting<AuthRole[]>(
        settingsQueryData.get(AUTH_SETTINGS_KEYS.roles),
        DEFAULT_AUTH_ROLES
      )
    );
  }, [roleSettingsQuery?.data, roleSettingsQuery?.isSuccess, settingsQueryData]);
};

export const useAuthComputedState = ({
  session,
  settingsQueryData,
  roleSettingsQuery,
}: AuthComputedStateInput) => {
  const basicInfo = useAuthBasicInfo(session);
  const roles = useAuthRolesList(settingsQueryData, roleSettingsQuery);

  const permissionsLibrary = useMemo(() => {
    if (roleSettingsQuery?.isSuccess === true && (roleSettingsQuery.data?.permissions?.length ?? 0) > 0) {
      return roleSettingsQuery.data?.permissions ?? DEFAULT_AUTH_PERMISSIONS;
    }
    if (settingsQueryData === undefined) return DEFAULT_AUTH_PERMISSIONS;
    return parseJsonSetting<AuthPermission[]>(
      settingsQueryData.get(AUTH_SETTINGS_KEYS.permissions),
      DEFAULT_AUTH_PERMISSIONS
    );
  }, [roleSettingsQuery?.data, roleSettingsQuery?.isSuccess, settingsQueryData]);

  const userRoles = useMemo(() => {
    if (roleSettingsQuery?.isSuccess === true) {
      return roleSettingsQuery.data?.userRoles ?? {};
    }
    if (settingsQueryData === undefined) return {};
    return parseJsonSetting<AuthUserRoleMap>(
      settingsQueryData.get(AUTH_SETTINGS_KEYS.userRoles),
      {}
    );
  }, [roleSettingsQuery?.data, roleSettingsQuery?.isSuccess, settingsQueryData]);

  const defaultRole = useMemo(() => {
    const storedDefault = roleSettingsQuery?.isSuccess === true
      ? (roleSettingsQuery.data?.defaultRoleId ?? null)
      : (settingsQueryData?.get(AUTH_SETTINGS_KEYS.defaultRole) ?? null);
    
    if (storedDefault !== null && roles.some((role) => role.id === storedDefault)) {
      return storedDefault;
    }
    return roles.find((role) => role.id === 'viewer')?.id ?? roles[0]?.id ?? 'viewer';
  }, [roleSettingsQuery?.data, roleSettingsQuery?.isSuccess, roles, settingsQueryData]);

  const securityPolicy = useMemo(() => {
    if (settingsQueryData === undefined) return DEFAULT_AUTH_SECURITY_POLICY;
    const storedPolicyRaw = settingsQueryData.get(AUTH_SETTINGS_KEYS.securityPolicy);
    return storedPolicyRaw
      ? normalizeAuthSecurityPolicy(
        parseJsonSetting<Partial<AuthSecurityPolicy>>(
          storedPolicyRaw,
          DEFAULT_AUTH_SECURITY_POLICY
        )
      )
      : DEFAULT_AUTH_SECURITY_POLICY;
  }, [settingsQueryData]);

  const userPageSettings = useMemo(() => {
    if (settingsQueryData === undefined) return DEFAULT_AUTH_USER_PAGE_SETTINGS;
    return parseJsonSetting<AuthUserPageSettings>(
      settingsQueryData.get(AUTH_SETTINGS_KEYS.userPages),
      DEFAULT_AUTH_USER_PAGE_SETTINGS
    );
  }, [settingsQueryData]);

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
