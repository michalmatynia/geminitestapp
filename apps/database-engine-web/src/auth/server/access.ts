import 'server-only';

import type { AuthRole, AuthUserAccessDetail, AuthUserPageSettings, AuthUserRoleMap } from '@/shared/contracts/auth';
import type { MongoSettingRecord } from '@/shared/contracts/base';
import { authError } from '@/shared/errors/app-error';
import { AUTH_SETTINGS_KEYS } from '@/shared/lib/auth/constants';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { parseJsonSetting } from '@/shared/utils/settings-json';

const ROLE_ELEVATION_THRESHOLD = 90;
const AUTH_ACCESS_CACHE_TTL_MS = Number.parseInt(
  process.env['AUTH_ACCESS_CACHE_TTL_MS'] ?? process.env['AUTH_TOKEN_REFRESH_TTL_MS'] ?? '300000',
  10
);
const AUTH_SETTINGS_CACHE_TTL_MS = Number.parseInt(
  process.env['AUTH_SETTINGS_CACHE_TTL_MS'] ?? process.env['AUTH_ACCESS_CACHE_TTL_MS'] ?? '60000',
  10
);

const DEFAULT_AUTH_USER_PAGE_SETTINGS: AuthUserPageSettings = {
  allowSignup: true,
  allowPasswordReset: true,
  allowSocialLogin: true,
  requireEmailVerification: false,
};

const DEFAULT_AUTH_ROLES: AuthRole[] = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'Full access to everything.',
    permissions: ['auth.users.read', 'auth.users.write', 'products.manage', 'notes.manage', 'chatbot.manage', 'ai_paths.manage', 'settings.manage', 'studiq.parent.access'],
    deniedPermissions: [],
    level: 100,
  },
  {
    id: 'superuser',
    name: 'Super User',
    description: 'Full access including system-level settings.',
    permissions: ['auth.users.read', 'auth.users.write', 'products.manage', 'notes.manage', 'chatbot.manage', 'ai_paths.manage', 'settings.manage', 'studiq.parent.access'],
    deniedPermissions: [],
    level: 95,
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Full access to all apps and settings.',
    permissions: ['auth.users.read', 'auth.users.write', 'products.manage', 'notes.manage', 'chatbot.manage', 'ai_paths.manage', 'settings.manage', 'studiq.parent.access'],
    deniedPermissions: [],
    level: 90,
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access.',
    permissions: ['auth.users.read'],
    deniedPermissions: [],
    level: 10,
  },
];

type MongoSettingDoc = Partial<MongoSettingRecord> & {
  updatedAt?: Date | string | null;
};

type AuthSettingsSnapshot = {
  roles: string | null;
  userRoles: string | null;
  defaultRole: string | null;
  userPages: string | null;
};

const parseCacheTtl = (value: number, fallback: number): number =>
  Number.isFinite(value) && value > 0 ? value : fallback;

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const normalizeAuthEmail = normalizeEmail;

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
  if (!process.env['MONGODB_URI']) {
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
      const doc = pickPreferredSettingDoc(
        docs.filter((candidate) => candidate._id === key || candidate.key === key)
      );
      return [key, typeof doc?.value === 'string' ? doc.value : null];
    })
  );
};

let authSettingsSnapshotCache: { value: AuthSettingsSnapshot; ts: number } | null = null;
let authSettingsSnapshotInflight: Promise<AuthSettingsSnapshot> | null = null;

const getAuthSettingsSnapshot = async (): Promise<AuthSettingsSnapshot> => {
  const now = Date.now();
  const ttl = parseCacheTtl(AUTH_SETTINGS_CACHE_TTL_MS, 60_000);
  if (authSettingsSnapshotCache !== null && now - authSettingsSnapshotCache.ts < ttl) {
    return authSettingsSnapshotCache.value;
  }
  if (authSettingsSnapshotInflight !== null) return authSettingsSnapshotInflight;

  const promise = (async (): Promise<AuthSettingsSnapshot> => {
    const values = await readMongoSettings([
      AUTH_SETTINGS_KEYS.roles,
      AUTH_SETTINGS_KEYS.userRoles,
      AUTH_SETTINGS_KEYS.defaultRole,
      AUTH_SETTINGS_KEYS.userPages,
    ]);

    return {
      roles: values[AUTH_SETTINGS_KEYS.roles] ?? null,
      userRoles: values[AUTH_SETTINGS_KEYS.userRoles] ?? null,
      defaultRole: values[AUTH_SETTINGS_KEYS.defaultRole] ?? null,
      userPages: values[AUTH_SETTINGS_KEYS.userPages] ?? null,
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

const mergeDefaultRoles = (roles: AuthRole[] | null | undefined): AuthRole[] => {
  const incoming = Array.isArray(roles) ? roles : [];
  const defaults = new Map<string, AuthRole>(DEFAULT_AUTH_ROLES.map((role) => [role.id, role]));
  const merged = incoming.map((role) => {
    const fallback = defaults.get(role.id);
    if (!fallback) return role;
    return {
      ...fallback,
      ...role,
      permissions: Array.isArray(role.permissions) ? role.permissions : fallback.permissions,
      deniedPermissions: Array.isArray(role.deniedPermissions)
        ? role.deniedPermissions
        : fallback.deniedPermissions ?? [],
      level: typeof role.level === 'number' ? role.level : fallback.level,
    };
  });

  const known = new Set(merged.map((role) => role.id));
  for (const role of DEFAULT_AUTH_ROLES) {
    if (!known.has(role.id)) merged.push(role);
  }
  return merged;
};

const getAuthRoles = async (): Promise<AuthRole[]> => {
  const snapshot = await getAuthSettingsSnapshot();
  return mergeDefaultRoles(parseJsonSetting<AuthRole[]>(snapshot.roles, DEFAULT_AUTH_ROLES));
};

const getAuthUserRoles = async (): Promise<AuthUserRoleMap> => {
  const snapshot = await getAuthSettingsSnapshot();
  return parseJsonSetting<AuthUserRoleMap>(snapshot.userRoles, {});
};

const getAuthDefaultRoleId = async (): Promise<string | null> => {
  const snapshot = await getAuthSettingsSnapshot();
  return snapshot.defaultRole?.trim() || null;
};

export const getAuthUserPageSettings = async (): Promise<AuthUserPageSettings> => {
  const snapshot = await getAuthSettingsSnapshot();
  return parseJsonSetting<AuthUserPageSettings>(
    snapshot.userPages,
    DEFAULT_AUTH_USER_PAGE_SETTINGS
  );
};

const resolveEffectiveRole = (
  roleList: AuthRole[],
  userRoles: AuthUserRoleMap,
  userId: string,
  defaultRoleId: string | null
): { role: AuthRole; roleAssigned: boolean } => {
  const assignedRoleId = userRoles[userId];
  const assignedRole = roleList.find((role) => role.id === assignedRoleId);
  if (assignedRole) return { role: assignedRole, roleAssigned: true };

  const defaultRole =
    defaultRoleId !== null ? roleList.find((role) => role.id === defaultRoleId) : undefined;
  const fallbackRole =
    defaultRole ??
    roleList.find((role) => role.id === 'viewer') ??
    roleList[0] ??
    DEFAULT_AUTH_ROLES[0]!;

  return { role: fallbackRole, roleAssigned: false };
};

const accessCache = new Map<string, { value: AuthUserAccessDetail; ts: number }>();
const accessInflight = new Map<string, Promise<AuthUserAccessDetail>>();

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

export const getAuthAccessForUser = async (userId: string): Promise<AuthUserAccessDetail> => {
  const now = Date.now();
  const ttl = parseCacheTtl(AUTH_ACCESS_CACHE_TTL_MS, 300_000);
  const cached = accessCache.get(userId);
  if (cached !== undefined && now - cached.ts < ttl) return cached.value;
  const inflight = accessInflight.get(userId);
  if (inflight !== undefined) return inflight;

  const promise = (async (): Promise<AuthUserAccessDetail> => {
    const [roles, userRoles, defaultRoleId] = await Promise.all([
      getAuthRoles(),
      getAuthUserRoles(),
      getAuthDefaultRoleId(),
    ]);
    const { role, roleAssigned } = resolveEffectiveRole(roles, userRoles, userId, defaultRoleId);
    const deniedPermissions = role.deniedPermissions ?? [];
    const permissions = (role.permissions ?? []).filter(
      (permission) => !deniedPermissions.includes(permission)
    );
    const level = role.level ?? 0;

    return {
      roleId: role.id,
      permissions,
      level,
      isElevated: level >= ROLE_ELEVATION_THRESHOLD,
      roleAssigned,
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

export async function readOptionalServerAuthSession() {
  const { auth } = await import('./auth');
  return auth();
}

export async function assertSettingsManageAccess(): Promise<void> {
  const session = await readOptionalServerAuthSession();
  const user = session?.user;
  if (user?.isElevated === true || user?.permissions?.includes('settings.manage')) return;

  throw authError('Unauthorized.');
}
