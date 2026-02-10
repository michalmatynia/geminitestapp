import 'server-only';

import { auth } from '@/features/auth/server';
import { authError } from '@/shared/errors/app-error';

export async function assertDatabaseEngineManageAccess(): Promise<void> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated ||
    session?.user?.permissions?.includes('settings.manage');
  if (!hasAccess) {
    throw authError('Unauthorized.');
  }
}
