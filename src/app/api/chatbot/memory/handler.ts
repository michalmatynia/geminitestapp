import { NextRequest, NextResponse } from 'next/server';

import { getAgentLongTermMemoryDelegate } from '@/features/ai/server';
import { chatbotMemoryQuerySchema } from '@/shared/contracts/chatbot';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { internalError } from '@/shared/errors/app-error';
import { logger } from '@/shared/utils/logger';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

export { chatbotMemoryQuerySchema as querySchema };

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  const agentLongTermMemory = getAgentLongTermMemoryDelegate();
  if (!agentLongTermMemory) {
    throw internalError('Long-term memory storage is unavailable.');
  }
  const query = chatbotMemoryQuerySchema.parse(_ctx.query ?? {});

  const where: Record<string, unknown> = {
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

  const items = await agentLongTermMemory.findMany({
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
