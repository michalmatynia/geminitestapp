import { NextRequest, NextResponse } from 'next/server';

import { listKangurDuelLobby, listKangurPublicDuelLobby } from '@/features/kangur/duels/server';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { AppErrorCodes, isAppError } from '@/shared/errors/app-error';
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

export async function getKangurDuelLobbyHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const limitParam = req.nextUrl.searchParams.get('limit');
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
  const actor = await resolveOptionalKangurActor(req);
  const response = actor
    ? await listKangurDuelLobby(requireActiveLearner(actor), {
        ...(Number.isFinite(limit) ? { limit } : {}),
      })
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
    },
  });

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
