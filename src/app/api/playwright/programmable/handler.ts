import { NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

import { findPlaywrightProgrammableIntegration } from './shared';

const getHandler = async (
  _req: Request,
  _ctx: ApiHandlerContext
): Promise<Response> => {
  const integration = await findPlaywrightProgrammableIntegration();
  return NextResponse.json(integration);
};

export { getHandler as GET_handler };
