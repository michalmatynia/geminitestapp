import { NextRequest } from 'next/server';


import { parseJsonBody } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

import { postAiPathsDbActionHandler } from '../db-command/handler';

const coerceProvider = (value: unknown): 'auto' | 'mongodb' | 'prisma' | undefined => {
  if (value === 'auto' || value === 'mongodb' || value === 'prisma') {
    return value;
  }
  return undefined;
};

export async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, undefined, {
    logPrefix: 'ai-paths.db-update',
  });
  if (!parsed.ok) return parsed.response;

  const body = parsed.data as Record<string, unknown>;
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
