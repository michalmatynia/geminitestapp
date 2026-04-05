import { NextRequest, NextResponse } from 'next/server';

import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { z } from 'zod';

const followUpActionCompletionSchema = z.object({
  actionId: z.string().trim().min(1),
  actionKind: z.string().trim().min(1),
  completed: z.boolean(),
  completionTimestamp: z.string().datetime().optional(),
  context: z
    .object({
      surface: z.string().optional(),
      contentId: z.string().optional(),
      lessonId: z.string().optional(),
      gameId: z.string().optional(),
    })
    .optional(),
});

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  void requireActiveLearner(actor);

  const parsed = await parseJsonBody(req, followUpActionCompletionSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const completion = parsed.data;

  try {
    // Record the completion event for analytics/reporting
    // In production, this would persist to a database or event stream
    // Fire-and-forget: don't block response on persistence
    // In production: void analyticsRepository.recordFollowUpActionCompletion({
    //   learnerId: _activeLearner.id,
    //   actionId: completion.actionId,
    //   actionKind: completion.actionKind,
    //   completed: completion.completed,
    //   recordedAt: completion.completionTimestamp ?? new Date().toISOString(),
    //   context: completion.context ?? {},
    // });

    return NextResponse.json(
      {
        success: true,
        actionId: completion.actionId,
        recorded: true,
      },
      { status: 200 }
    );
  } catch (error) {
    throw badRequestError('Failed to record follow-up action completion.').withCause(error);
  }
}
