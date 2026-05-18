import 'server-only';

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
import type { AuthUserAccessDetail as AuthUserAccess } from '@/shared/contracts/auth';
import { type MongoSettingRecord } from '@/shared/contracts/base';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { parseJsonSetting } from '@/shared/utils/settings-json';
import { readMongoSettings } from './auth-settings-reader';

type AuthSettingsSnapshot = {
  permissions: string | null;
  roles: string | null;
  userRoles: string | null;
  defaultRole: string | null;
};

const AUTH_ACCESS_SETTING_KEYS = {
  permissions: AUTH_SETTINGS_KEYS.permissions,
  roles: AUTH_SETTINGS_KEYS.roles,
  userRoles: AUTH_SETTINGS_KEYS.userRoles,
  defaultRole: AUTH_SETTINGS_KEYS.defaultRole,
} as const;

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const AUTH_SETTINGS_CACHE_TTL_MS = parseNumber(
  process.env['AUTH_SETTINGS_CACHE_TTL_MS'] ?? process.env['AUTH_ACCESS_CACHE_TTL_MS'],
  60_000
);

let authSettingsSnapshotCache: { value: AuthSettingsSnapshot; ts: number } | null = null;
let authSettingsSnapshotInflight: Promise<AuthSettingsSnapshot> | null = null;

const buildAuthSettingsSnapshot = (values: Record<string, string | null>): AuthSettingsSnapshot => ({
  permissions: values[AUTH_ACCESS_SETTING_KEYS.permissions] ?? null,
  roles: values[AUTH_ACCESS_SETTING_KEYS.roles] ?? null,
  userRoles: values[AUTH_ACCESS_SETTING_KEYS.userRoles] ?? null,
  defaultRole: values[AUTH_ACCESS_SETTING_KEYS.defaultRole] ?? null,
});

const getAuthSettingsSnapshot = async (): Promise<AuthSettingsSnapshot> => {
  const now = Date.now();
  if (
    authSettingsSnapshotCache !== null &&
    now - authSettingsSnapshotCache.ts < AUTH_SETTINGS_CACHE_TTL_MS
  ) {
    return authSettingsSnapshotCache.value;
  }
  if (authSettingsSnapshotInflight !== null) return authSettingsSnapshotInflight;

  const promise = (async (): Promise<AuthSettingsSnapshot> => {
    const keys = [
      AUTH_SETTINGS_KEYS.permissions,
      AUTH_SETTINGS_KEYS.roles,
      AUTH_SETTINGS_KEYS.userRoles,
      AUTH_SETTINGS_KEYS.defaultRole,
    ] as const;
    const values = await readMongoSettings(keys);
    return buildAuthSettingsSnapshot(values);
  })();

  authSettingsSnapshotInflight = promise;
  try {
    const value = await promise;
    if (authSettingsSnapshotInflight === promise) {
      // eslint-disable-next-line require-atomic-updates
      authSettingsSnapshotCache = { value, ts: Date.now() };
    }
    return value;
  } finally {
    if (authSettingsSnapshotInflight === promise) authSettingsSnapshotInflight = null;
  }
};

const readSettingValue = async (key: keyof AuthSettingsSnapshot): Promise<string | null> => {
  const snapshot = await getAuthSettingsSnapshot();
  return snapshot[key];
};

export const getAuthPermissions = async (): Promise<AuthPermission[]> => {
  const value = await readSettingValue('permissions');
  return parseJsonSetting<AuthPermission[]>(value, DEFAULT_AUTH_PERMISSIONS);
};

export const getAuthRoles = async (): Promise<AuthRole[]> => {
  const value = await readSettingValue('roles');
  return mergeDefaultRoles(parseJsonSetting<AuthRole[]>(value, DEFAULT_AUTH_ROLES));
};

export const getAuthUserRoles = async (): Promise<AuthUserRoleMap> => {
  const value = await readSettingValue('userRoles');
  return parseJsonSetting<AuthUserRoleMap>(value, {});
};

export const getAuthDefaultRoleId = async (): Promise<string | null> => {
  const value = await readSettingValue('defaultRole');
  return value !== null ? value.trim() : null;
};

const AUTH_ACCESS_CACHE_TTL_MS = parseNumber(
  process.env['AUTH_ACCESS_CACHE_TTL_MS'] ?? process.env['AUTH_TOKEN_REFRESH_TTL_MS'],
  300_000
);

const accessCache = new Map<string, { value: AuthUserAccess; ts: number }>();
const accessInflight = new Map<string, Promise<AuthUserAccess>>();

export const invalidateAuthAccessCache = (userId?: string): void => {
  authSettingsSnapshotCache = null;
  authSettingsSnapshotInflight = null;
  if (userId !== undefined) {
    accessCache.delete(userId);
    accessInflight.delete(userId);
    return;
  }
  accessCache.clear();
  accessInflight.clear();
};

const getFallbackRole = (roleList: AuthRole[]): AuthRole => {
  const viewer = roleList.find((r) => r.id === 'viewer');
  const other = roleList.find((r) => !['super_admin', 'superuser', 'admin'].includes(r.id));
  const first = roleList[0];
  const defaultFirst = DEFAULT_AUTH_ROLES[0];
  return viewer ?? other ?? first ?? (defaultFirst as AuthRole);
};

const resolveDefaultAndFallbackRole = (
  roleList: AuthRole[],
  defaultRoleId: string | null
): AuthRole => {
  const fallback = getFallbackRole(roleList);
  if (defaultRoleId !== null) {
    const found = roleList.find((r) => r.id === defaultRoleId);
    if (found !== undefined) return found;
  }
  return fallback;
};

const resolveEffectiveRole = (
  roleList: AuthRole[],
  userRoles: AuthUserRoleMap,
  userId: string,
  defaultRoleId: string | null
): { role: AuthRole; roleAssigned: boolean } => {
  const assignedRoleId = userRoles[userId];
  const assignedRole =
    assignedRoleId !== undefined ? roleList.find((r) => r.id === assignedRoleId) : undefined;

  if (assignedRole !== undefined) return { role: assignedRole, roleAssigned: true };
  return { role: resolveDefaultAndFallbackRole(roleList, defaultRoleId), roleAssigned: false };
};

const resolveUserPermissions = (role: AuthRole): string[] => {
  const denied = role.deniedPermissions ?? [];
  return role.permissions.filter((p: string) => !denied.includes(p));
};

const fetchUserAccessData = async (): Promise<[AuthRole[], AuthUserRoleMap, string | null]> =>
  Promise.all([getAuthRoles(), getAuthUserRoles(), getAuthDefaultRoleId()]);

const buildUserAccessResult = (
  role: AuthRole,
  roleAssigned: boolean,
  permissions: string[]
): AuthUserAccess => {
  const level = role.level ?? 0;
  return {
    roleId: role.id,
    permissions,
    level,
    isElevated: level >= ROLE_ELEVATION_THRESHOLD,
    roleAssigned,
    role,
  };
};

const resolveUserAccessState = (
  roleList: AuthRole[],
  userRoles: AuthUserRoleMap,
  userId: string,
  defaultRoleId: string | null
): { role: AuthRole; roleAssigned: boolean } =>
  resolveEffectiveRole(roleList, userRoles, userId, defaultRoleId);

const resolveUserAccess = async (userId: string): Promise<AuthUserAccess> => {
  const [rawRoles, userRoles, defaultRoleId] = await fetchUserAccessData();
  const roleList = rawRoles.length > 0 ? rawRoles : DEFAULT_AUTH_ROLES;
  const { role, roleAssigned } = resolveUserAccessState(roleList, userRoles, userId, defaultRoleId);

  const permissions = resolveUserPermissions(role);
  return buildUserAccessResult(role, roleAssigned, permissions);
};

const getCachedAuthAccess = (userId: string): AuthUserAccess | null => {
  const now = Date.now();
  const cached = accessCache.get(userId);
  if (cached !== undefined && now - cached.ts < AUTH_ACCESS_CACHE_TTL_MS) return cached.value;
  return null;
};

const getInflightAuthAccess = (userId: string): Promise<AuthUserAccess> | null =>
  accessInflight.get(userId) ?? null;

const updateAccessCache = (userId: string, value: AuthUserAccess): void => {
  accessCache.set(userId, { value, ts: Date.now() });
};

const runAndCacheUserAccess = async (userId: string): Promise<AuthUserAccess> => {
  const promise = resolveUserAccess(userId);
  accessInflight.set(userId, promise);
  try {
    const value = await promise;
    updateAccessCache(userId, value);
    return value;
  } finally {
    if (accessInflight.get(userId) === promise) accessInflight.delete(userId);
  }
};

export const getAuthAccessForUser = async (userId: string): Promise<AuthUserAccess> => {
  const cached = getCachedAuthAccess(userId);
  if (cached !== null) return cached;
  const inflight = getInflightAuthAccess(userId);
  if (inflight !== null) return inflight;

  return runAndCacheUserAccess(userId);
};

const upsertAuthUserRolesSetting = async (
  currentMap: AuthUserRoleMap
): Promise<unknown> => {
  const mongo = await getMongoDb();
  const now = new Date();
  const col = mongo.collection<MongoSettingRecord>('settings');
  return await col.findOneAndUpdate(
    { $or: [{ _id: AUTH_SETTINGS_KEYS.userRoles }, { key: AUTH_SETTINGS_KEYS.userRoles }] },
    {
      $set: {
        key: AUTH_SETTINGS_KEYS.userRoles,
        value: JSON.stringify(currentMap),
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true, returnDocument: 'after' }
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';

const readFindOneAndUpdateValue = (res: unknown): unknown =>
  isRecord(res) && 'ok' in res ? res['value'] : res;

const readStringId = (value: unknown): string | null => {
  if (!isRecord(value)) return null;
  const id = value['_id'];
  return typeof id === 'string' && id.length > 0 ? id : null;
};

const extractUpdatedSettingId = (res: unknown): string | null =>
  readStringId(readFindOneAndUpdateValue(res));

const deleteDuplicateAuthUserRoleSettings = async (updatedId: string | null): Promise<void> => {
  if (updatedId === null) return;
  const mongo = await getMongoDb();
  await mongo.collection<MongoSettingRecord>('settings').deleteMany({
    $or: [{ _id: AUTH_SETTINGS_KEYS.userRoles }, { key: AUTH_SETTINGS_KEYS.userRoles }],
    _id: { $ne: updatedId },
  });
};

const updateAuthUserRolesInMongo = async (currentMap: AuthUserRoleMap): Promise<void> => {
  const result = await upsertAuthUserRolesSetting(currentMap);
  await deleteDuplicateAuthUserRoleSettings(extractUpdatedSettingId(result));
};

export const assignAuthUserRole = async (input: {
  userId: string;
  roleId: string;
  source: string;
}): Promise<void> => {
  const uri = process.env['MONGODB_URI'];
  if (uri === undefined || uri.length === 0) return;
  const currentMap = await getAuthUserRoles();
  if (currentMap[input.userId] === input.roleId) return;
  currentMap[input.userId] = input.roleId;

  await updateAuthUserRolesInMongo(currentMap);
  invalidateAuthAccessCache(input.userId);
  await logSystemEvent({
    level: 'info',
    message: `Role "${input.roleId}" assigned to user ${input.userId}.`,
    source: input.source,
    service: 'auth',
    context: { userId: input.userId, roleId: input.roleId, source: input.source },
  });
};
