export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

import {
  disableSettingsRateLimit,
  GET_handler,
  POST_handler,
} from './handler';

import type { NextRequest } from 'next/server';

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> =>
    GET_handler(req, ctx),
  { source: 'settings.GET', rateLimitKey: disableSettingsRateLimit ? false : 'api' }
);

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> =>
    POST_handler(req, ctx),
  { source: 'settings.POST', rateLimitKey: disableSettingsRateLimit ? false : 'write' }
);

export { GET_handler };
