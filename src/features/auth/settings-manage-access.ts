import 'server-only';

import { authError } from '@/shared/errors/app-error';
import { readOptionalServerAuthSession } from './optional-server-auth';

export async function assertSettingsManageAccess(): Promise<void> {
  const session = await readOptionalServerAuthSession();
  if (hasAccess(session)) return;

  throw authError('Unauthorized: Access to settings management requires elevated privileges or specific management permissions.');
}

function hasAccess(session: { user?: { isElevated?: boolean; permissions?: string[] } } | null): boolean {
  if (!session?.user) return false;
  const { isElevated = false, permissions = [] } = session.user;
  return isElevated || permissions.includes('settings.manage');
}

