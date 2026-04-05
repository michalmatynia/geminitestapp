import { NextRequest, NextResponse } from 'next/server';

import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { resolveKangurActor } from '@/features/kangur/server';
import { resolveKangurTtsContextRegistryEnvelope } from '@/features/kangur/tts/context-registry/server';
import { kangurLessonTtsRequestSchema } from '@/features/kangur/tts/contracts';
import { ensureKangurLessonNarrationAudio } from '@/features/kangur/tts/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { AppErrorCodes, badRequestError, isAppError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const readBodyJson = async (request: NextRequest): Promise<unknown> => {
  const rawBody = await request.text();
  if (!rawBody) {
    throw badRequestError('Kangur TTS payload is required.');
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

const resolveOptionalKangurActor = async (request: NextRequest) => {
  try {
    return await resolveKangurActor(request);
  } catch (error) {
    if (isAppError(error) && error.code === AppErrorCodes.unauthorized) {
      return null;
    }
    void ErrorSystem.captureException(error, {
      service: 'kangur.tts',
      source: 'kangur.tts.POST',
      action: 'resolveOptionalKangurActor',
    });
    throw error;
  }
};

export async function postKangurTtsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveOptionalKangurActor(req);
  const payload = kangurLessonTtsRequestSchema.parse(await resolveBodyJson(req, ctx));
  const contextRegistry = await resolveKangurTtsContextRegistryEnvelope(payload.contextRegistry);
  const response = await ensureKangurLessonNarrationAudio({
    script: payload.script,
    voice: payload.voice,
    forceRegenerate: payload.forceRegenerate,
    contextRegistry,
  });

  if (response.mode === 'fallback') {
    void logKangurServerEvent({
      source: 'kangur.tts.fallback',
      message: 'Kangur lesson TTS used browser fallback narration',
      level: response.reason === 'empty_script' ? 'info' : 'warn',
      service: 'kangur.tts',
      request: req,
      requestContext: ctx,
      actor,
      statusCode: 200,
      context: {
        lessonId: payload.script.lessonId,
        locale: payload.script.locale,
        voice: payload.voice,
        forceRegenerate: payload.forceRegenerate ?? false,
        reason: response.reason,
        segmentCount: response.segments.length,
        contextRegistryRefCount: contextRegistry?.refs.length ?? 0,
        contextRegistryDocumentCount: contextRegistry?.resolved?.documents.length ?? 0,
      },
    });
  }

  void logKangurServerEvent({
    source: 'kangur.tts.generate',
    message: 'Kangur lesson TTS requested',
    service: 'kangur.tts',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      lessonId: payload.script.lessonId,
      locale: payload.script.locale,
      voice: payload.voice,
      forceRegenerate: payload.forceRegenerate ?? false,
      mode: response.mode,
      reason: 'reason' in response ? response.reason : null,
      segmentCount: response.segments.length,
      contextRegistryRefCount: contextRegistry?.refs.length ?? 0,
      contextRegistryDocumentCount: contextRegistry?.resolved?.documents.length ?? 0,
    },
  });
  return NextResponse.json(response);
}
