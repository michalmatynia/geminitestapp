import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getKangurLearnerById,
  listKangurLearnerSessions,
  resolveKangurActor,
} from '@/features/kangur/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { forbiddenError, validationError } from '@/shared/errors/app-error';
import { optionalIntegerQuerySchema } from '@/shared/lib/api/query-schema';

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Learner id is required'),
});

const querySchema = z.object({
  limit: optionalIntegerQuerySchema(z.number().int()),
  offset: optionalIntegerQuerySchema(z.number().int()),
});

export async function getKangurLearnerSessionsHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    throw validationError('Invalid route parameters', {
      issues: parsedParams.error.flatten(),
    });
  }
  const learnerId = parsedParams.data.id;

  const parsedQuery = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries())
  );
  if (!parsedQuery.success) {
    throw validationError('Invalid query parameters', {
      issues: parsedQuery.error.flatten(),
    });
  }
  const { limit, offset } = parsedQuery.data;
  const actor = await resolveKangurActor(req);
  if (!actor.canManageLearners) {
    throw forbiddenError('Only parent accounts can manage learners.');
  }

  const learner = await getKangurLearnerById(learnerId);
  if (learner?.ownerUserId !== actor.ownerUserId) {
    throw forbiddenError('This learner does not belong to the current parent account.', {
      learnerId,
    });
  }

  const history = await listKangurLearnerSessions({
    ownerUserId: actor.ownerUserId,
    learnerId,
    limit,
    offset,
  });

  return NextResponse.json(history, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
