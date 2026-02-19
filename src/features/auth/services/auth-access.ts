import 'server-only';

import { getAuthDataProvider, requireAuthProvider } from '@/features/auth/services/auth-provider';
import {
  AUTH_SETTINGS_KEYS,
  DEFAULT_AUTH_PERMISSIONS,
  DEFAULT_AUTH_ROLES,
  mergeDefaultRoles,
  ROLE_ELEVATION_THRESHOLD,
  type AuthPermission,
  type AuthRole,
  type AuthUserRoleMap,
} from '@/features/auth/utils/auth-management';
import type { AuthUserAccessDetailDto as AuthUserAccess } from '@/shared/contracts/auth';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { MongoSettingRecord } from '@/shared/types/core/base-types';
import { parseJsonSetting } from '@/shared/utils/settings-json';


const canUsePrismaSettings = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

const readPrismaSetting = async (key: string): Promise<string | null> => {
  if (!canUsePrismaSettings()) return null;
  try {
    const setting = await prisma.setting.findUnique({
      where: { key },
      select: { value: true },
    });
    return setting?.value ?? null;
  } catch {
    return null;
  }
};

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoSettingRecord>('settings')
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const readSettingValue = async (key: string): Promise<string | null> => {
  const provider = requireAuthProvider(await getAuthDataProvider());
  return provider === 'mongodb' ? readMongoSetting(key) : readPrismaSetting(key);
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


const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const AUTH_ACCESS_CACHE_TTL_MS = parseNumber(
  process.env['AUTH_ACCESS_CACHE_TTL_MS'] ?? process.env['AUTH_TOKEN_REFRESH_TTL_MS'],
  60_000
);

const accessCache = new Map<string, { value: AuthUserAccess; ts: number }>();
const accessInflight = new Map<string, Promise<AuthUserAccess>>();

export const invalidateAuthAccessCache = (userId?: string): void => {
  if (userId) {
    accessCache.delete(userId);
    accessInflight.delete(userId);
    return;
  }
  accessCache.clear();
  accessInflight.clear();
};

export const getAuthAccessForUser = async (userId: string): Promise<AuthUserAccess> => {
  const now = Date.now();
  const cached = accessCache.get(userId);
  if (cached && now - cached.ts < AUTH_ACCESS_CACHE_TTL_MS) {
    return cached.value;
  }
  const inflight = accessInflight.get(userId);
  if (inflight) return inflight;

  const promise = (async (): Promise<AuthUserAccess> => {
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
      roleList.find((role: AuthRole) => role.id === 'viewer')?.id ??
      roleList.find((role: AuthRole) => !['super_admin', 'superuser', 'admin'].includes(role.id))
        ?.id ??
      roleList[0]?.id ??
      'admin';

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
  })();

  accessInflight.set(userId, promise);
  try {
    const value = await promise;
    accessCache.set(userId, { value, ts: Date.now() });
    return value;
  } finally {
    accessInflight.delete(userId);
  }
};
