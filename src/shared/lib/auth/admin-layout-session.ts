import type { Session } from 'next-auth';

export const ADMIN_LAYOUT_SESSION_HEADER = 'x-admin-layout-session';

type SessionUser = NonNullable<Session['user']>;

const normalizeString = (value: unknown): string | null | undefined => {
  if (typeof value !== 'string') return undefined;
  return value;
};

const normalizeNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  return value;
};

const normalizeBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const normalizeNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const normalizePermissions = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry: unknown): entry is string => typeof entry === 'string') : [];

const normalizeSessionUser = (value: unknown): SessionUser | null => {
  if (!value || typeof value !== 'object') return null;

  const rawUser = value as Record<string, unknown>;
  if (typeof rawUser['id'] !== 'string' || rawUser['id'].trim().length === 0) {
    return null;
  }

  return {
    id: rawUser['id'],
    name: normalizeString(rawUser['name']) ?? null,
    email: normalizeString(rawUser['email']) ?? null,
    image: normalizeString(rawUser['image']) ?? null,
    role: normalizeNullableString(rawUser['role']),
    roleLevel: normalizeNumber(rawUser['roleLevel']),
    isElevated: normalizeBoolean(rawUser['isElevated'], false),
    roleAssigned: normalizeBoolean(rawUser['roleAssigned'], false),
    permissions: normalizePermissions(rawUser['permissions']),
    accountDisabled: normalizeBoolean(rawUser['accountDisabled'], false),
    accountBanned: normalizeBoolean(rawUser['accountBanned'], false),
  };
};

export const normalizeAdminLayoutSession = (value: unknown): Session | null => {
  if (!value || typeof value !== 'object') return null;

  const rawSession = value as Record<string, unknown>;
  const user = normalizeSessionUser(rawSession['user']);
  if (!user) return null;

  const expires =
    typeof rawSession['expires'] === 'string' && rawSession['expires'].trim().length > 0
      ? rawSession['expires']
      : new Date(0).toISOString();

  return { user, expires };
};

export const buildAdminLayoutSessionHeaderValue = (
  session: Session | null | undefined
): string | null => {
  const normalizedSession = normalizeAdminLayoutSession(session);
  if (!normalizedSession?.user?.id) return null;
  return encodeURIComponent(JSON.stringify(normalizedSession));
};

export const parseAdminLayoutSessionHeaderValue = (value: string | null | undefined): Session | null => {
  if (!value) return null;

  try {
    return normalizeAdminLayoutSession(JSON.parse(decodeURIComponent(value)));
  } catch {
    return null;
  }
};
