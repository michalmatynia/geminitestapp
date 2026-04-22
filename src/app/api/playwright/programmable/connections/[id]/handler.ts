import { type NextRequest } from 'next/server';

import {
  programmableConnectionMutationSchema,
  updatePlaywrightProgrammableConnection,
} from '@/features/playwright/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const putHandler = async (
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> => {
  const parsed = await parseJsonBody(req, programmableConnectionMutationSchema, {
    logPrefix: 'playwright.programmable.connections.PUT',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  return Response.json(
    await updatePlaywrightProgrammableConnection({
      connectionId: params.id,
      data: parsed.data,
    })
  );
};

export { putHandler as putHandler };
