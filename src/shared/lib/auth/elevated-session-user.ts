import type { Session } from 'next-auth';

const ELEVATED_SESSION_ROLES = new Set(['admin', 'super_admin', 'superuser']);

type SessionUserWithElevation = Session['user'] & {
  isElevated?: boolean;
  role?: string | null;
};

const getNormalizedSessionRole = (
  session: Session | null | undefined
): string | null => {
  const user = session?.user as SessionUserWithElevation | undefined;
  const role = user?.role?.trim().toLowerCase() ?? '';
  return role.length > 0 ? role : null;
};

export type ElevatedSessionUserSnapshot = {
  email: string | null;
  image: string | null;
  name: string | null;
  role: string | null;
};

export const isElevatedSession = (
  session: Session | null | undefined
): boolean => {
  if (!session?.user) {
    return false;
  }

  const user = session.user as SessionUserWithElevation;
  if (user.isElevated) {
    return true;
  }

  const role = getNormalizedSessionRole(session);
  return role ? ELEVATED_SESSION_ROLES.has(role) : false;
};

export const isSuperAdminSession = (
  session: Session | null | undefined
): boolean => getNormalizedSessionRole(session) === 'super_admin';

export const getElevatedSessionUserSnapshot = (
  session: Session | null | undefined
): ElevatedSessionUserSnapshot | null => {
  if (!isElevatedSession(session)) {
    return null;
  }

  const user = session?.user as SessionUserWithElevation | undefined;
  return {
    email: user?.email ?? null,
    image: user?.image ?? null,
    name: user?.name ?? null,
    role: user?.role ?? null,
  };
};
