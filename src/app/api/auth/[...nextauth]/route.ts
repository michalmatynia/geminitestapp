import { NextRequest, NextResponse } from 'next/server';

import { handlers } from '@/features/auth/server';
import { logAuthEvent } from '@/features/auth/utils/auth-request-logger';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

export const runtime = 'nodejs';

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await logAuthEvent({ req, action: 'auth.nextauth', stage: 'start' });
  try {
    const response = await handlers.GET(req);
    await logAuthEvent({ req, action: 'auth.nextauth', stage: 'success', status: response.status });
    return response;
  } catch (error) {
    if (req.nextUrl.pathname.endsWith('/session')) {
      const response = NextResponse.json(null, { status: 200 });
      response.headers.set('Cache-Control', 'no-store');
      await logAuthEvent({ req, action: 'auth.nextauth', stage: 'failure', status: 200, outcome: 'session-fallback' });
      return response;
    }
    throw error;
  }
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await logAuthEvent({ req, action: 'auth.nextauth', stage: 'start' });
  const response = await handlers.POST(req);
  await logAuthEvent({ req, action: 'auth.nextauth', stage: 'success', status: response.status });
  return response;
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'auth.[...nextauth].GET', requireCsrf: false });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'auth.[...nextauth].POST', requireCsrf: false });
