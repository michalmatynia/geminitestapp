import "server-only";

import { getMongoDb } from "@/shared/lib/db/mongo-client";
import {
  AUTH_SETTINGS_KEYS,
  DEFAULT_AUTH_PERMISSIONS,
  DEFAULT_AUTH_ROLES,
  mergeDefaultRoles,
  ROLE_ELEVATION_THRESHOLD,
  type AuthPermission,
  type AuthRole,
  type AuthUserRoleMap,
} from "@/features/auth/utils/auth-management";
import { parseJsonSetting } from "@/shared/utils/settings-json";

import { MongoSettingRecord } from "@/shared/types/base-types";

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env.MONGODB_URI) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoSettingRecord>("settings")
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === "string" ? doc.value : null;
};

const readSettingValue = async (key: string): Promise<string | null> => {
  return readMongoSetting(key);
};

export const getAuthPermissions = async (): Promise<AuthPermission[]> => {
  const value = await readSettingValue(AUTH_SETTINGS_KEYS.permissions);
  return parseJsonSetting<AuthPermission[]>(value, DEFAULT_AUTH_PERMISSIONS);
};

export const getAuthRoles = async (): Promise<AuthRole[]> => {
  const value = await readSettingValue(AUTH_SETTINGS_KEYS.roles);
  return mergeDefaultRoles(parseJsonSetting<AuthRole[]>(value, DEFAULT_AUTH_ROLES));
};

export const getAuthUserRoles = async (): Promise<AuthUserRoleMap> => {
  const value = await readSettingValue(AUTH_SETTINGS_KEYS.userRoles);
  return parseJsonSetting<AuthUserRoleMap>(value, {});
};

export const getAuthDefaultRoleId = async (): Promise<string | null> => {
  const value = await readSettingValue(AUTH_SETTINGS_KEYS.defaultRole);
  if (!value) return null;
  return value.trim();
};

export type AuthUserAccess = {
  roleId: string;
  permissions: string[];
  level: number;
  isElevated: boolean;
  role?: AuthRole;
};

export const getAuthAccessForUser = async (userId: string): Promise<AuthUserAccess> => {
  const [roles, userRoles, defaultRoleId] = await Promise.all([
    getAuthRoles(),
    getAuthUserRoles(),
    getAuthDefaultRoleId(),
  ]);
  const roleList = roles.length > 0 ? roles : DEFAULT_AUTH_ROLES;
  const validDefaultRoleId =
    defaultRoleId && roleList.some((role: AuthRole) => role.id === defaultRoleId)
      ? defaultRoleId
      : null;
  const fallbackRoleId =
    roleList.find((role: AuthRole) => role.id === "viewer")?.id ??
    roleList.find((role: AuthRole) => !["super_admin", "superuser", "admin"].includes(role.id))
      ?.id ??
    roleList[0]?.id ??
    "admin";

  const assignedRoleId = userRoles[userId];
  const isAssignedValid = assignedRoleId
    ? roleList.some((role: AuthRole) => role.id === assignedRoleId)
    : false;
  const effectiveRoleId = isAssignedValid
    ? (assignedRoleId as string)
    : validDefaultRoleId ?? fallbackRoleId;

  const role =
    roleList.find((item: AuthRole) => item.id === effectiveRoleId) ??
    roleList[0] ??
    DEFAULT_AUTH_ROLES[0]!;

  const roleLevel = role.level ?? 0;
  const denied = role.deniedPermissions ?? [];
  const permissions = (role.permissions ?? []).filter(
    (permission: string) => !denied.includes(permission)
  );

  return {
    roleId: role.id,
    permissions,
    level: roleLevel,
    isElevated: roleLevel >= ROLE_ELEVATION_THRESHOLD,
    role,
  };
};
