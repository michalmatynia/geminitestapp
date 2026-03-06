import { NextRequest, NextResponse } from 'next/server';

import { resolveKangurActor } from '@/features/kangur/server';
import { kangurLessonTtsStatusRequestSchema } from '@/features/kangur/tts/contracts';
import { inspectKangurLessonNarrationAudio } from '@/features/kangur/tts/server';
import { badRequestError } from '@/shared/errors/app-error';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const readBodyJson = async (request: NextRequest): Promise<unknown> => {
  const rawBody = await request.text();
  if (!rawBody) {
    throw badRequestError('Kangur TTS status payload is required.');
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw badRequestError('Invalid JSON payload.');
  }
};

export async function postKangurTtsStatusHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await resolveKangurActor(req);
  const payload = kangurLessonTtsStatusRequestSchema.parse(await readBodyJson(req));
  const response = await inspectKangurLessonNarrationAudio({
    script: payload.script,
    voice: payload.voice,
  });

  return NextResponse.json(response);
}
