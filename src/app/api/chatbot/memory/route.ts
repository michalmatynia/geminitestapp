export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { internalError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import prisma from '@/shared/lib/db/prisma';
import type { ApiHandlerContext } from '@/shared/types/api';
import { logger } from '@/shared/utils/logger';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  if (!('agentLongTermMemory' in prisma)) {
    throw internalError(
      'Long-term memory table not initialized. Run prisma generate/db push.'
    );
  }
  const url = new URL(req.url);
  const memoryKey = url.searchParams.get('memoryKey')?.trim() || null;
  const tag = url.searchParams.get('tag')?.trim() || null;
  const query = url.searchParams.get('q')?.trim() || null;
  const limitParam = Number(url.searchParams.get('limit'));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 50;

  const where = {
    ...(memoryKey ? { memoryKey } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
    ...(query
      ? {
        OR: [
          { content: { contains: query, mode: 'insensitive' as const } },
          { summary: { contains: query, mode: 'insensitive' as const } },
          { tags: { has: query } },
        ],
      }
      : {}),
  };

  const items = await prisma.agentLongTermMemory.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });

  if (DEBUG_CHATBOT) {
    logger.info('[chatbot][memory][GET] Loaded', {
      count: items.length,
      durationMs: Date.now() - requestStart,
    });
  }
  return NextResponse.json({ items });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'chatbot.memory.GET' });
