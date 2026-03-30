import 'server-only';

import { authError } from '@/shared/errors/app-error';
import { readOptionalServerAuthSession } from './optional-server-auth';

export async function assertSettingsManageAccess(): Promise<void> {
  const session = await readOptionalServerAuthSession();
  const hasAccess =
    session?.user?.isElevated || session?.user?.permissions?.includes('settings.manage');
  if (!hasAccess) {
    throw authError('Unauthorized.');
  }
}
