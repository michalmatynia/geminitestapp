import { type NextRequest } from 'next/server';

import { assertSettingsManageAccess } from '@/features/auth/server';
import {
  promotePlaywrightProgrammableBrowserOwnershipSchema,
  promotePlaywrightProgrammableConnectionBrowserOwnership,
} from '@/features/playwright/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const postHandler = async (
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> => {
  await assertSettingsManageAccess();

  const parsed = await parseJsonBody(req, promotePlaywrightProgrammableBrowserOwnershipSchema, {
    logPrefix: 'playwright.programmable.connections.promoteBrowserOwnership.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  return Response.json(
    await promotePlaywrightProgrammableConnectionBrowserOwnership({
      connectionId: params.id,
      payload: parsed.data,
    })
  );
};

export { postHandler as POST_handler };
