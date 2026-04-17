import {
  playwrightProgrammableTestPayloadSchema,
  runPlaywrightProgrammableConnectionTest,
} from '@/features/playwright/server';
import { type NextRequest, NextResponse } from 'next/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const postHandler = async (
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> => {
  const parsed = await parseJsonBody(req, playwrightProgrammableTestPayloadSchema, {
    logPrefix: 'integrations.playwright.test.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  return NextResponse.json(await runPlaywrightProgrammableConnectionTest(parsed.data));
};

export { postHandler as POST_handler };
