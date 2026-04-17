import { NextResponse } from 'next/server';

import { assertSettingsManageAccess } from '@/features/auth/server';
import { cleanupAllPlaywrightProgrammableConnectionsBrowserPersistence } from '@/features/playwright/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const postHandler = async (
  _req: Request,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> => {
  await assertSettingsManageAccess();

  return NextResponse.json(
    await cleanupAllPlaywrightProgrammableConnectionsBrowserPersistence(params.id)
  );
};

export { postHandler as POST_handler };
