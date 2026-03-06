import { NextRequest, NextResponse } from 'next/server';

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
  _ctx: ApiHandlerContext
): Promise<Response> {
  await resolveKangurActor(req);
  const payload = kangurLessonTtsRequestSchema.parse(await readBodyJson(req));
  const response = await ensureKangurLessonNarrationAudio({
    script: payload.script,
    voice: payload.voice,
    forceRegenerate: payload.forceRegenerate,
  });

  return NextResponse.json(response);
}
