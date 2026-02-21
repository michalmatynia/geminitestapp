import { MongoClient } from 'mongodb';
import { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { configurationError } from '@/shared/errors/app-error';

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    throw configurationError('MONGODB_URI missing');
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

  try {
    await client.connect();
    await client.db().command({ ping: 1 });
    return Response.json({ ok: true });
  } finally {
    await client.close().catch(() => {});
  }
}
