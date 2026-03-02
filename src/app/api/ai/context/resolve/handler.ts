import { NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { contextResolveRequestSchema } from '@/shared/contracts/ai-context-registry';
import { badRequestError } from '@/shared/errors/app-error';
import { resolveNodes } from '@/features/ai/ai-context-registry/server';

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const rawBody = await req.text();
  let body: unknown = {};

  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw badRequestError('Invalid JSON body.');
    }
  }

  const parsed = contextResolveRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid resolve request payload.');
  }

  const result = resolveNodes(parsed.data.ids);

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
    },
  });
}
