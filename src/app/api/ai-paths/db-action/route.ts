export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

import { postAiPathsDbActionHandler } from './handler';

import type { NextRequest } from 'next/server';

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> =>
    postAiPathsDbActionHandler(req, ctx),
  { source: 'ai-paths.db-action' }
);
