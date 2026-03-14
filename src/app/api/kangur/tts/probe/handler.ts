import { NextRequest, NextResponse } from 'next/server';

import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { resolveKangurActor } from '@/features/kangur/server';
import { kangurLessonTtsProbeRequestSchema } from '@/features/kangur/tts/contracts';
import { probeKangurLessonNarrationBackend } from '@/features/kangur/tts/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, forbiddenError } from '@/shared/errors/app-error';


const readBodyJson = async (request: NextRequest): Promise<unknown> => {
  const rawBody = await request.text();
  if (!rawBody) {
    throw badRequestError('Kangur TTS próbę payload is required.');
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw badRequestError('Invalid JSON payload.');
  }
};

const resolveBodyJson = async (
  request: NextRequest,
  ctx: ApiHandlerContext
): Promise<unknown> => {
  if (ctx.body !== undefined) {
    return ctx.body;
  }
  return readBodyJson(request);
};

export async function postKangurTtsProbeHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (!actor.canManageLearners) {
    throw forbiddenError('Only parents or admins can próbę Kangur server narration.');
  }

  const payload = kangurLessonTtsProbeRequestSchema.parse(await resolveBodyJson(req, ctx));
  const response = await probeKangurLessonNarrationBackend(payload);

  void logKangurServerEvent({
    source: response.ok ? 'kangur.tts.probe.ready' : 'kangur.tts.probe.failed',
    message: response.ok
      ? 'Kangur server narrator próbę succeeded'
      : 'Kangur server narrator próbę failed',
    level: response.ok ? 'info' : 'warn',
    service: 'kangur.tts',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      voice: response.voice,
      model: response.model,
      stage: response.stage,
      errorName: response.errorName,
      errorStatus: response.errorStatus,
      errorCode: response.errorCode,
    },
  });

  return NextResponse.json(response);
}
