import { type NextRequest, NextResponse } from 'next/server';

import { assertSettingsManageAccess } from '@/features/auth/server';
import {
  promotePlaywrightProgrammableBrowserOwnershipSchema,
  promotePlaywrightProgrammableConnectionBrowserOwnership,
} from '@/features/playwright/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const postHandler = async (
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> => {
  await assertSettingsManageAccess();

  const parsed = await parseJsonBody(req, promotePlaywrightProgrammableBrowserOwnershipSchema, {
    logPrefix: 'integrations.connections.promotePlaywrightBrowserOwnership.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  return NextResponse.json(
    await promotePlaywrightProgrammableConnectionBrowserOwnership({
      connectionId: params.id,
      payload: parsed.data,
    })
  );
};

export { postHandler as postHandler };
