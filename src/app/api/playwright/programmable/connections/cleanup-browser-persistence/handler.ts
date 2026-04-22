import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

import { assertSettingsManageAccess } from '@/features/auth/server';
import { cleanupAllPlaywrightProgrammableConnectionsBrowserPersistence } from '@/features/playwright/server';

import { requirePlaywrightProgrammableIntegration } from '../../shared';

const postHandler = async (
  _req: Request,
  _ctx: ApiHandlerContext
): Promise<Response> => {
  await assertSettingsManageAccess();

  const integration = await requirePlaywrightProgrammableIntegration();
  return Response.json(
    await cleanupAllPlaywrightProgrammableConnectionsBrowserPersistence(integration.id)
  );
};

export { postHandler as postHandler };
