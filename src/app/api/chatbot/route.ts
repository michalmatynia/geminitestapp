export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

import { GET_handler, POST_handler } from './handler';

import type { NextRequest } from 'next/server';

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> =>
    GET_handler(req, ctx),
  { source: 'chatbot.GET' }
);

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> =>
    POST_handler(req, ctx),
  { source: 'chatbot.POST' }
);
