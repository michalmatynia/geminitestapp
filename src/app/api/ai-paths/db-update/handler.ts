import { NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

import { postAiPathsDbActionHandler } from '../db-command/handler';

const coerceProvider = (value: unknown): 'auto' | 'mongodb' | 'prisma' | undefined => {
  if (value === 'auto' || value === 'mongodb' || value === 'prisma') {
    return value;
  }
  return undefined;
};

export async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const provider = coerceProvider(body['provider']);
  const mappedPayload: Record<string, unknown> = {
    ...(provider ? { provider } : {}),
    collection: body['collection'],
    ...(body['collectionMap'] !== undefined ? { collectionMap: body['collectionMap'] } : {}),
    action: body['single'] === false ? 'updateMany' : 'updateOne',
    filter: body['query'],
    update: body['updates'],
    ...(body['idType'] !== undefined ? { idType: body['idType'] } : {}),
  };

  const forwarded = new NextRequest(new URL('/api/ai-paths/db-command', req.url), {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify(mappedPayload),
  });

  return postAiPathsDbActionHandler(forwarded, ctx);
}
