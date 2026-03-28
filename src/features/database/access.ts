import 'server-only';

import { assertSettingsManageAccess } from '@/features/auth/server';

export async function assertDatabaseEngineManageAccess(): Promise<void> {
  await assertSettingsManageAccess();
}
