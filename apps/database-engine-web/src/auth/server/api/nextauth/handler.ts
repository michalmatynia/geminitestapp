import { handlers } from '../../auth';

import type { NextRequest } from 'next/server';

export async function getHandler(request: NextRequest, _ctx?: unknown): Promise<Response> {
  return handlers.GET(request);
}

export async function postHandler(request: NextRequest, _ctx?: unknown): Promise<Response> {
  return handlers.POST(request);
}
