import { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

import { postAiPathsDbActionHandler } from '../db-command/handler';

export { postAiPathsDbActionHandler };

export async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  return postAiPathsDbActionHandler(req, ctx);
}
