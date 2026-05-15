import 'server-only';

import { authError } from '@/shared/errors/app-error';
import { readOptionalServerAuthSession } from './optional-server-auth';

export async function assertSettingsManageAccess(): Promise<void> {
  const session = await readOptionalServerAuthSession();
  if (hasAccess(session)) return;

  throw authError('Unauthorized: Access to settings management requires elevated privileges or specific management permissions.');
}

function hasAccess(session: { user?: { isElevated?: boolean; permissions?: string[] } } | null): boolean {
  const isElevated = session?.user?.isElevated ?? false;
  const canManage = session?.user?.permissions?.includes('settings.manage') ?? false;
  return isElevated || canManage;
}
