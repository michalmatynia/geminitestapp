import { NextRequest, NextResponse } from 'next/server';

import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { z } from 'zod';

import { buildConversationSessionId, getConversationHistory } from './conversation-history';

const querySchema = z.object({
  surface: z.string().trim().optional(),
  contentId: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const activeLearner = requireActiveLearner(actor);
  const learnerId = activeLearner.id;

  const url = new URL(req.url);
  const queryParams = {
    surface: url.searchParams.get('surface'),
    contentId: url.searchParams.get('contentId'),
    limit: url.searchParams.get('limit'),
  };

  const parsed = querySchema.safeParse(queryParams);
  if (!parsed.success) {
    throw badRequestError('Invalid query parameters.');
  }

  const { surface, contentId, limit } = parsed.data;
  const sessionId = buildConversationSessionId(learnerId, surface, contentId);
  const messages = await getConversationHistory(sessionId, limit);

  return NextResponse.json({ messages });
}
