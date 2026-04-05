import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listKangurDuelLobby, listKangurPublicDuelLobby } from '@/features/kangur/duels/server';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { AppErrorCodes, isAppError, validationError } from '@/shared/errors/app-error';
import { optionalIntegerQuerySchema } from '@/shared/lib/api/query-schema';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const resolveOptionalKangurActor = async (request: NextRequest) => {
  try {
    return await resolveKangurActor(request);
  } catch (error) {
    void ErrorSystem.captureException(error);
    if (isAppError(error) && error.code === AppErrorCodes.unauthorized) {
      return null;
    }
    throw error;
  }
};

const querySchema = z.object({
  limit: optionalIntegerQuerySchema(z.number().int()),
  visibility: z.enum(['public', 'private']).optional(),
});

export async function getKangurDuelLobbyHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const parsedQuery = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries())
  );
  if (!parsedQuery.success) {
    throw validationError('Invalid query parameters', {
      issues: parsedQuery.error.flatten(),
    });
  }
  const { limit, visibility } = parsedQuery.data;
  const actor = await resolveOptionalKangurActor(req);
  const response = actor
    ? await listKangurDuelLobby(requireActiveLearner(actor), {
        ...(Number.isFinite(limit) ? { limit } : {}),
        ...(visibility ? { visibility } : {}),
      })
    : visibility === 'private'
      ? {
          entries: [],
          serverTime: new Date().toISOString(),
        }
      : await listKangurPublicDuelLobby({
          ...(Number.isFinite(limit) ? { limit } : {}),
        });
  const inviteCount = response.entries.filter((entry) => entry.visibility === 'private').length;
  const publicCount = response.entries.length - inviteCount;

  void logKangurServerEvent({
    source: 'kangur.duels.lobby',
    message: 'Kangur duel lobby requested',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      entries: response.entries.length,
      publicEntries: publicCount,
      inviteEntries: inviteCount,
      isGuest: !actor,
      limit: Number.isFinite(limit) ? limit : null,
      visibility: visibility ?? null,
    },
  });

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
