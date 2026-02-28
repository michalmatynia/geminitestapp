import 'server-only';

import { authError } from '@/shared/errors/app-error';

export async function assertDatabaseEngineManageAccess(): Promise<void> {
  const { auth } = await import('@/features/auth/server');
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated || session?.user?.permissions?.includes('settings.manage');
  if (!hasAccess) {
    throw authError('Unauthorized.');
  }
}
