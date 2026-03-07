import { NextRequest, NextResponse } from 'next/server';

import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { resolveKangurActor } from '@/features/kangur/server';
import { ensureKangurLessonNarrationAudio } from '@/features/kangur/tts/server';
import { kangurLessonTtsRequestSchema } from '@/features/kangur/tts/contracts';
import { badRequestError } from '@/shared/errors/app-error';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const readBodyJson = async (request: NextRequest): Promise<unknown> => {
  const rawBody = await request.text();
  if (!rawBody) {
    throw badRequestError('Kangur TTS payload is required.');
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw badRequestError('Invalid JSON payload.');
  }
};

export async function postKangurTtsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const payload = kangurLessonTtsRequestSchema.parse(await readBodyJson(req));
  const response = await ensureKangurLessonNarrationAudio({
    script: payload.script,
    voice: payload.voice,
    forceRegenerate: payload.forceRegenerate,
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
    },
  });
  return NextResponse.json(response);
}
