import { NextRequest, NextResponse } from 'next/server';

import { chatbotSessionRepository } from '@/features/ai/chatbot/server';
import { resolveKangurActor } from '@/features/kangur/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { z } from 'zod';

const querySchema = z.object({
  learnerId: z.string().trim().min(1),
  surface: z.string().trim().optional(),
  contentId: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

const buildConversationSessionId = (
  learnerId: string,
  surface?: string | null,
  contentId?: string | null
): string => {
  const surfaceLabel = surface || 'default';
  const contentLabel = contentId || 'unknown';
  return `kangur-ai-tutor:${learnerId}:${surfaceLabel}:${contentLabel}`;
};

export async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await resolveKangurActor(req);

  const url = new URL(req.url);
  const queryParams = {
    learnerId: url.searchParams.get('learnerId'),
    surface: url.searchParams.get('surface'),
    contentId: url.searchParams.get('contentId'),
    limit: url.searchParams.get('limit'),
  };

  const parsed = querySchema.safeParse(queryParams);
  if (!parsed.success) {
    throw badRequestError('Invalid query parameters: learnerId is required.');
  }

  const { learnerId, surface, contentId, limit } = parsed.data;
  const sessionId = buildConversationSessionId(learnerId, surface, contentId);

  try {
    const session = await chatbotSessionRepository.findById(sessionId);
    if (!session?.messages) {
      return NextResponse.json(
        {
          learnerId,
          surface: surface || null,
          contentId: contentId || null,
          messages: [],
          sessionId,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      learnerId,
      surface: surface || null,
      contentId: contentId || null,
      messages: session.messages.slice(-limit),
      sessionId,
      messageCount: session.messages.length,
    });
  } catch (_error) {
    throw badRequestError('Failed to retrieve conversation history.');
  }
}
