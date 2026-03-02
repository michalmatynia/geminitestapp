import { NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { contextSearchRequestSchema } from '@/shared/contracts/ai-context-registry';
import { badRequestError } from '@/shared/errors/app-error';
import { searchNodes } from '@/features/ai/ai-context-registry/server';

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

  const parsed = contextSearchRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid search request payload.');
  }

  const result = searchNodes(parsed.data);

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
    },
  });
}
