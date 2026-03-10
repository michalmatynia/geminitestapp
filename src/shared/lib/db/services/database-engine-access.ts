import 'server-only';

import { assertSettingsManageAccess } from '@/shared/lib/auth/settings-manage-access';

export async function assertDatabaseEngineManageAccess(): Promise<void> {
  await assertSettingsManageAccess();
}
