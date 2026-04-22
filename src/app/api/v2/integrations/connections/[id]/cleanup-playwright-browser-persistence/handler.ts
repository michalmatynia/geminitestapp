import { NextResponse } from 'next/server';

import { assertSettingsManageAccess } from '@/features/auth/server';
import { cleanupPlaywrightProgrammableConnectionBrowserPersistence } from '@/features/playwright/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const postHandler = async (
  _req: Request,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> => {
  await assertSettingsManageAccess();

  return NextResponse.json(
    await cleanupPlaywrightProgrammableConnectionBrowserPersistence(params.id)
  );
};

export { postHandler as postHandler };
