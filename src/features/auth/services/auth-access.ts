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

type MongoSettingDoc = Partial<MongoSettingRecord> & {
  updatedAt?: Date | string | null;
};

type AuthSettingsSnapshot = {
  permissions: string | null;
  roles: string | null;
  userRoles: string | null;
  defaultRole: string | null;
};

const getUpdatedAtMs = (value: Date | string | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const pickPreferredSettingDoc = (docs: MongoSettingDoc[]): MongoSettingDoc | null => {
  let selected: MongoSettingDoc | null = null;
  for (const doc of docs) {
    if (doc === undefined || typeof doc.value !== 'string') continue;
    if (selected === null) {
      selected = doc;
      continue;
    }
    const docHasKey = typeof doc.key === 'string' && doc.key.trim().length > 0;
    const selectedHasKey = typeof selected.key === 'string' && selected.key.trim().length > 0;
    if (docHasKey && !selectedHasKey) {
      selected = doc;
      continue;
    }
    if (selectedHasKey && !docHasKey) continue;
    
    const docUpdated = getUpdatedAtMs(doc.updatedAt);
    const selectedUpdated = getUpdatedAtMs(selected.updatedAt);
    if (docUpdated !== null && (selectedUpdated === null || docUpdated > selectedUpdated)) {
      selected = doc;
    }
  }
  return selected;
};

const readMongoSettings = async (
  keys: readonly string[]
): Promise<Record<string, string | null>> => {
  if (process.env['MONGODB_URI'] === undefined || process.env['MONGODB_URI'] === '') {
    return Object.fromEntries(keys.map((key) => [key, null]));
  }
  const mongo = await getMongoDb();
  const docs = await mongo
    .collection<MongoSettingDoc>('settings')
    .find(
      { $or: keys.flatMap((key) => [{ _id: key }, { key }]) },
      { projection: { _id: 1, key: 1, value: 1, updatedAt: 1 } }
    )
    .toArray();

  return Object.fromEntries(
    keys.map((key) => {
      const doc = pickPreferredSettingDoc(docs.filter((candidate) => candidate._id === key || candidate.key === key));
      return [key, typeof doc?.value === 'string' ? doc.value : null];
    })
  );
};

const readSettingValue = async (key: string): Promise<string | null> => {
  const snapshot = await getAuthSettingsSnapshot();
  return snapshot[key as keyof AuthSettingsSnapshot] ?? null;
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const AUTH_ACCESS_SETTING_KEYS = {
  permissions: AUTH_SETTINGS_KEYS.permissions,
  roles: AUTH_SETTINGS_KEYS.roles,
  userRoles: AUTH_SETTINGS_KEYS.userRoles,
  defaultRole: AUTH_SETTINGS_KEYS.defaultRole,
} as const;

const AUTH_SETTINGS_CACHE_TTL_MS = parseNumber(
  process.env['AUTH_SETTINGS_CACHE_TTL_MS'] ?? process.env['AUTH_ACCESS_CACHE_TTL_MS'],
  60_000
);

let authSettingsSnapshotCache: { value: AuthSettingsSnapshot; ts: number } | null = null;
let authSettingsSnapshotInflight: Promise<AuthSettingsSnapshot> | null = null;

const getAuthSettingsSnapshot = async (): Promise<AuthSettingsSnapshot> => {
  const now = Date.now();
  if (authSettingsSnapshotCache !== null && now - authSettingsSnapshotCache.ts < AUTH_SETTINGS_CACHE_TTL_MS) {
    return authSettingsSnapshotCache.value;
  }
  if (authSettingsSnapshotInflight !== null) return authSettingsSnapshotInflight;

  const promise = (async (): Promise<AuthSettingsSnapshot> => {
    const keys = [AUTH_SETTINGS_KEYS.permissions, AUTH_SETTINGS_KEYS.roles, AUTH_SETTINGS_KEYS.userRoles, AUTH_SETTINGS_KEYS.defaultRole] as const;
    const isMongo = process.env['MONGODB_URI'] !== undefined && process.env['MONGODB_URI'] !== '';
    const values = isMongo ? await readMongoSettings(keys) : Object.fromEntries(keys.map((key) => [key, null]));

    return {
      permissions: values[AUTH_ACCESS_SETTING_KEYS.permissions] ?? null,
      roles: values[AUTH_ACCESS_SETTING_KEYS.roles] ?? null,
      userRoles: values[AUTH_ACCESS_SETTING_KEYS.userRoles] ?? null,
      defaultRole: values[AUTH_ACCESS_SETTING_KEYS.defaultRole] ?? null,
    };
  })();

  authSettingsSnapshotInflight = promise;
  try {
    const value = await promise;
    authSettingsSnapshotCache = { value, ts: Date.now() };
    return value;
  } finally {
    authSettingsSnapshotInflight = null;
  }
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
  if (value === null) return null;
  return value.trim();
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

const resolveEffectiveRole = (roleList: AuthRole[], userRoles: AuthUserRoleMap, userId: string, defaultRoleId: string | null): { role: AuthRole; roleAssigned: boolean } => {
  const assignedRoleId = userRoles[userId];
  const isAssignedValid = assignedRoleId !== undefined && roleList.some((r) => r.id === assignedRoleId);
  
  if (isAssignedValid) {
    const found = roleList.find((r) => r.id === assignedRoleId);
    if (found) return { role: found, roleAssigned: true };
  }

  const validDefaultId = (defaultRoleId !== null && roleList.some((r) => r.id === defaultRoleId)) ? defaultRoleId : null;
  const fallbackId = roleList.find((r) => r.id === 'viewer')?.id ?? roleList.find((r) => !['super_admin', 'superuser', 'admin'].includes(r.id))?.id ?? roleList[0]?.id ?? 'admin';
  
  const effectiveId = validDefaultId ?? fallbackId;
  const role = roleList.find((r) => r.id === effectiveId) ?? roleList[0] ?? DEFAULT_AUTH_ROLES[0]!;
  return { role, roleAssigned: false };
};

export const getAuthAccessForUser = async (userId: string): Promise<AuthUserAccess> => {
  const now = Date.now();
  const cached = accessCache.get(userId);
  if (cached !== undefined && now - cached.ts < AUTH_ACCESS_CACHE_TTL_MS) return cached.value;
  const inflight = accessInflight.get(userId);
  if (inflight !== undefined) return inflight;

  const promise = (async (): Promise<AuthUserAccess> => {
    const [rawRoles, userRoles, defaultRoleId] = await Promise.all([getAuthRoles(), getAuthUserRoles(), getAuthDefaultRoleId()]);
    const roleList = rawRoles.length > 0 ? rawRoles : DEFAULT_AUTH_ROLES;
    const { role, roleAssigned } = resolveEffectiveRole(roleList, userRoles, userId, defaultRoleId);

    const denied = role.deniedPermissions ?? [];
    const permissions = (role.permissions ?? []).filter((p: string) => !denied.includes(p));

    return { roleId: role.id, permissions, level: role.level ?? 0, isElevated: (role.level ?? 0) >= ROLE_ELEVATION_THRESHOLD, roleAssigned, role };
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

export const assignAuthUserRole = async (input: { userId: string; roleId: string; source: string }): Promise<void> => {
  if (process.env['MONGODB_URI'] === undefined || process.env['MONGODB_URI'] === '') return;
  const currentMap = await getAuthUserRoles();
  if (currentMap[input.userId] === input.roleId) return;
  currentMap[input.userId] = input.roleId;

  const mongo = await getMongoDb();
  const now = new Date();
  const col = mongo.collection<MongoSettingRecord>('settings');
  const res = await col.findOneAndUpdate(
    { $or: [{ _id: AUTH_SETTINGS_KEYS.userRoles }, { key: AUTH_SETTINGS_KEYS.userRoles }] },
    { $set: { key: AUTH_SETTINGS_KEYS.userRoles, value: JSON.stringify(currentMap), updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true, returnDocument: 'after' }
  );

  const updated = res && typeof res === 'object' && 'ok' in res ? res.value : res;
  if (updated && typeof updated === 'object' && '_id' in updated) {
    await col.deleteMany({ $or: [{ _id: AUTH_SETTINGS_KEYS.userRoles }, { key: AUTH_SETTINGS_KEYS.userRoles }], _id: { $ne: updated._id } });
  }

  invalidateAuthAccessCache(input.userId);
  await logSystemEvent({ level: 'info', message: `Role "${input.roleId}" assigned to user ${input.userId}.`, source: input.source, service: 'auth', context: { userId: input.userId, roleId: input.roleId, source: input.source } });
};
