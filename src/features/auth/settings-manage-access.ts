import 'server-only';

import { authError } from '@/shared/errors/app-error';
import { readOptionalServerAuthSession } from './optional-server-auth';

export async function assertSettingsManageAccess(): Promise<void> {
  const session = await readOptionalServerAuthSession();
  if (hasAccess(session)) return;

  throw authError('Unauthorized.');
}

function hasAccess(session: any): boolean {
  const isElevated = session?.user?.isElevated ?? false;
  const canManage = session?.user?.permissions?.includes('settings.manage') ?? false;
  return isElevated || canManage;
}
