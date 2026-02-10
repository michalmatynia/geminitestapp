import { NextRequest, NextResponse } from 'next/server';

import { createMongoBackup, createPostgresBackup } from '@/features/database/server';
import { forbiddenError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

export const runtime = 'nodejs';

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  if (process.env['NODE_ENV'] === 'production') {
    throw forbiddenError('Database backups are disabled in production.');
  }
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'postgresql';

  if (type === 'mongodb') {
    const result = await createMongoBackup();
    return NextResponse.json(result);
  }

  const result = await createPostgresBackup();
  return NextResponse.json(result);
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'databases.backup.POST' });
