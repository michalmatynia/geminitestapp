import 'server-only';

import { authError } from '@/shared/errors/app-error';
import { readOptionalServerAuthSession } from './optional-server-auth';

export async function assertSettingsManageAccess(): Promise<void> {
  const session = await readOptionalServerAuthSession();
  const isElevated = session?.user?.isElevated ?? false;
  const canManage = session?.user?.permissions?.includes('settings.manage') ?? false;

  if (isElevated || canManage) return;

  throw authError('Unauthorized.');
}
