import 'server-only';

import { forbiddenError } from '@/shared/errors/app-error';
import { isElevatedSession } from '@/shared/lib/auth/elevated-session-user';
import { readOptionalServerAuthSession } from '@/features/auth/server';

type FilemakerMailSession = Awaited<ReturnType<typeof readOptionalServerAuthSession>>;

const hasSettingsManagePermission = (session: FilemakerMailSession): boolean =>
  session?.user?.permissions?.includes('settings.manage') === true;

export const canAccessFilemakerMailAdmin = (session: FilemakerMailSession): boolean =>
  isElevatedSession(session) || hasSettingsManagePermission(session);

export async function requireFilemakerMailAdminSession(): Promise<void> {
  const session = await readOptionalServerAuthSession();
  if (!canAccessFilemakerMailAdmin(session)) {
    throw forbiddenError('Admin access is required for Filemaker mail.');
  }
}
