import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";
import {
  AUTH_SETTINGS_KEYS,
  DEFAULT_AUTH_PERMISSIONS,
  DEFAULT_AUTH_ROLES,
  mergeDefaultRoles,
  parseJsonSetting,
  type AuthPermission,
  type AuthRole,
  type AuthUserRoleMap,
} from "@/lib/constants/auth-management";

type SettingRecord = { key: string; value: string };

const canUsePrismaSettings = () =>
  Boolean(process.env.DATABASE_URL) && "setting" in prisma;

const readSettingValue = async (key: string): Promise<string | null> => {
  if (canUsePrismaSettings()) {
    const setting = await prisma.setting.findUnique({
      where: { key },
      select: { value: true },
    });
    if (setting?.value) {
      return setting.value;
    }
  }

  if (!process.env.MONGODB_URI) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<SettingRecord>("settings")
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === "string" ? doc.value : null;
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

export type AuthUserAccess = {
  roleId: string;
  permissions: string[];
  role?: AuthRole;
};

export const getAuthAccessForUser = async (userId: string): Promise<AuthUserAccess> => {
  const [roles, userRoles] = await Promise.all([getAuthRoles(), getAuthUserRoles()]);
  const roleList = roles.length > 0 ? roles : DEFAULT_AUTH_ROLES;
  const hasAssignedRoles = Object.keys(userRoles).length > 0;
  const fallbackRoleId =
    roleList.find((role) => role.id === "viewer")?.id ?? roleList[0]?.id ?? "admin";

  const assignedRoleId = userRoles[userId];
  const isAssignedValid = assignedRoleId
    ? roleList.some((role) => role.id === assignedRoleId)
    : false;
  const effectiveRoleId = isAssignedValid
    ? (assignedRoleId as string)
    : hasAssignedRoles
    ? fallbackRoleId
    : "admin";

  const role =
    roleList.find((item) => item.id === effectiveRoleId) ??
    roleList[0] ??
    DEFAULT_AUTH_ROLES[0];

  return {
    roleId: role.id,
    permissions: role.permissions ?? [],
    role,
  };
};
