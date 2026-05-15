import 'server-only';

/* eslint-disable max-lines */

import type { Session } from 'next-auth';
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

type NormalizedAuthRole = AuthRole & {
  deniedPermissions: string[];
};

const DEFAULT_AUTH_ROLES: NormalizedAuthRole[] = [
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

const hasSettingValue = (doc: MongoSettingDoc): doc is MongoSettingDoc & { value: string } =>
  typeof doc.value === 'string';

const hasDocumentKey = (doc: MongoSettingDoc): boolean => {
  return typeof doc.key === 'string' && doc.key.trim() !== '';
};

const isMoreRecentSettingDoc = (
  candidate: MongoSettingDoc,
  selected: MongoSettingDoc
): boolean => {
  const candidateUpdated = getUpdatedAtMs(candidate.updatedAt);
  if (candidateUpdated === null) return false;

  const selectedUpdated = getUpdatedAtMs(selected.updatedAt);
  return selectedUpdated === null || candidateUpdated > selectedUpdated;
};

const pickPreferredSettingDoc = (docs: MongoSettingDoc[]): MongoSettingDoc | null => {
  return docs.filter(hasSettingValue).reduce<MongoSettingDoc | null>((selected, candidate) => {
    if (selected === null) {
      return candidate;
    }

    const candidateHasKey = hasDocumentKey(candidate);
    if (!candidateHasKey) return selected;

    if (hasDocumentKey(selected)) {
      return isMoreRecentSettingDoc(candidate, selected) ? candidate : selected;
    }

    return candidate;
  }, null);
};

const readMongoSettings = async (
  keys: readonly string[]
): Promise<Record<string, string | null>> => {
  const mongoDbUri = process.env['MONGODB_URI'];
  if (mongoDbUri === undefined || mongoDbUri === '') {
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
  const currentSnapshot = authSettingsSnapshotCache;
  if (currentSnapshot !== null && now - currentSnapshot.ts < ttl) {
    return currentSnapshot.value;
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
    if (
      authSettingsSnapshotInflight === promise &&
      authSettingsSnapshotCache === currentSnapshot
    ) {
      authSettingsSnapshotCache = { value, ts: Date.now() };
    }
    return value;
  } finally {
    if (authSettingsSnapshotInflight === promise) {
      authSettingsSnapshotInflight = null;
    }
  }
};

const getDeniedPermissions = (fallback: AuthRole, role: AuthRole): string[] => {
  if (Array.isArray(role.deniedPermissions)) return role.deniedPermissions;
  if (Array.isArray(fallback.deniedPermissions)) return fallback.deniedPermissions;
  return [];
};

const mergeDefaultRoles = (roles: AuthRole[] | null | undefined): AuthRole[] => {
  const incoming = Array.isArray(roles) ? roles : [];
  const defaults = new Map<string, AuthRole>(DEFAULT_AUTH_ROLES.map((role) => [role.id, role]));
  const merged: NormalizedAuthRole[] = incoming.map((role) => {
    const fallback = defaults.get(role.id);
    if (!fallback) {
      return {
        ...role,
        permissions: Array.isArray(role.permissions) ? role.permissions : [],
        deniedPermissions: Array.isArray(role.deniedPermissions) ? role.deniedPermissions : [],
      } satisfies NormalizedAuthRole;
    }
    const deniedPermissions = getDeniedPermissions(fallback, role);
    return {
      ...fallback,
      ...role,
      permissions: Array.isArray(role.permissions) ? role.permissions : fallback.permissions,
      deniedPermissions,
      level: typeof role.level === 'number' ? role.level : fallback.level,
    } satisfies NormalizedAuthRole;
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
  const defaultRole = snapshot.defaultRole?.trim();
  return defaultRole === '' || defaultRole === undefined ? null : defaultRole;
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
    DEFAULT_AUTH_ROLES[0];

  if (!fallbackRole) {
    throw new Error('No auth roles available');
  }

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
    const { role, roleAssigned } = resolveEffectiveRole(
      roles as Array<NormalizedAuthRole>,
      userRoles,
      userId,
      defaultRoleId
    );
    const deniedPermissions = (role as NormalizedAuthRole).deniedPermissions;
    const permissions = (role as NormalizedAuthRole).permissions.filter(
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

export async function readOptionalServerAuthSession(): Promise<Session | null> {
  const authModule = (await import('./auth')) as { auth: () => Promise<Session | null> };
  return authModule.auth();
}

export async function assertSettingsManageAccess(): Promise<void> {
  const session = await readOptionalServerAuthSession();
  const user = session?.user as
    | ({ isElevated?: boolean | null; permissions?: string[] | null } & Record<string, unknown>)
    | null
    | undefined;
  const userPermissions = user?.permissions ?? [];
  if (user?.isElevated === true || userPermissions.includes('settings.manage')) {
    return;
  }

  throw authError('Unauthorized.');
}
