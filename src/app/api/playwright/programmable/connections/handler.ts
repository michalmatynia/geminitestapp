import { NextResponse, type NextRequest } from 'next/server';

import {
  createPlaywrightProgrammableConnection,
  listPlaywrightProgrammableConnections,
  programmableConnectionMutationSchema,
} from '@/features/playwright/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

import {
  findPlaywrightProgrammableIntegration,
  requirePlaywrightProgrammableIntegration,
} from '../shared';

const getHandler = async (
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> => {
  const integration = await findPlaywrightProgrammableIntegration();

  if (integration === null) {
    return NextResponse.json([]);
  }

  return NextResponse.json(await listPlaywrightProgrammableConnections(integration.id));
};

const postHandler = async (
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> => {
  const integration = await requirePlaywrightProgrammableIntegration();
  const parsed = await parseJsonBody(req, programmableConnectionMutationSchema, {
    logPrefix: 'playwright.programmable.connections.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  return NextResponse.json(
    await createPlaywrightProgrammableConnection({
      integrationId: integration.id,
      data: parsed.data,
    })
  );
};

export { getHandler as GET_handler, postHandler as POST_handler };
