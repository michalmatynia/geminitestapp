import { type NextRequest } from 'next/server';

import {
  playwrightProgrammableTestPayloadSchema,
  runPlaywrightProgrammableConnectionTest,
} from '@/features/playwright/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const postHandler = async (
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> => {
  const parsed = await parseJsonBody(req, playwrightProgrammableTestPayloadSchema, {
    logPrefix: 'playwright.programmable.test.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  return Response.json(await runPlaywrightProgrammableConnectionTest(parsed.data));
};

export { postHandler as postHandler };
