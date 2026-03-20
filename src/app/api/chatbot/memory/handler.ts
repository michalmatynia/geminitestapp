import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { internalError } from '@/shared/errors/app-error';
import {
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';
import prisma from '@/shared/lib/db/prisma';
import { logger } from '@/shared/utils/logger';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

export const querySchema = z.object({
  memoryKey: optionalTrimmedQueryString(),
  tag: optionalTrimmedQueryString(),
  q: optionalTrimmedQueryString(),
  limit: optionalIntegerQuerySchema(z.number().int().positive().max(100)).default(50),
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  if (!('agentLongTermMemory' in prisma)) {
    throw internalError('Long-term memory table not initialized. Run prisma generate/db push.');
  }
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;

  const where = {
    ...(query.memoryKey ? { memoryKey: query.memoryKey } : {}),
    ...(query.tag ? { tags: { has: query.tag } } : {}),
    ...(query.q
      ? {
        OR: [
          { content: { contains: query.q, mode: 'insensitive' as const } },
          { summary: { contains: query.q, mode: 'insensitive' as const } },
          { tags: { has: query.q } },
        ],
      }
      : {}),
  };

  const items = await prisma.agentLongTermMemory.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: query.limit,
  });

  if (DEBUG_CHATBOT) {
    logger.info('[chatbot][memory][GET] Loaded', {
      count: items.length,
      durationMs: Date.now() - requestStart,
    });
  }
  return NextResponse.json({ items });
}
