import { NextRequest, NextResponse } from 'next/server';

import { resolveKangurActor } from '@/features/kangur/server';
import { resolveKangurTtsContextRegistryEnvelope } from '@/features/kangur/tts/context-registry/server';
import { kangurLessonTtsStatusRequestSchema } from '@/features/kangur/tts/contracts';
import { inspectKangurLessonNarrationAudio } from '@/features/kangur/tts/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { AppErrorCodes, badRequestError, isAppError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';



const readBodyJson = async (request: NextRequest): Promise<unknown> => {
  const rawBody = await request.text();
  if (!rawBody) {
    throw badRequestError('Kangur TTS status payload is required.');
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch (error) {
    throw badRequestError('Invalid JSON payload.').withCause(error);
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

const resolveOptionalKangurActor = async (request: NextRequest): Promise<void> => {
  try {
    await resolveKangurActor(request);
  } catch (error) {
    if (isAppError(error) && error.code === AppErrorCodes.unauthorized) {
      return;
    }
    void ErrorSystem.captureException(error, {
      service: 'kangur.tts',
      source: 'kangur.tts.status.POST',
      action: 'resolveOptionalKangurActor',
    });
    throw error;
  }
};

export async function postKangurTtsStatusHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  await resolveOptionalKangurActor(req);
  const payload = kangurLessonTtsStatusRequestSchema.parse(await resolveBodyJson(req, ctx));
  const contextRegistry = await resolveKangurTtsContextRegistryEnvelope(payload.contextRegistry);
  const response = await inspectKangurLessonNarrationAudio({
    script: payload.script,
    voice: payload.voice,
    contextRegistry,
  });

  return NextResponse.json(response);
}
