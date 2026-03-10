import { NextRequest, NextResponse } from 'next/server';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import {
  getKangurAiTutorContent,
  upsertKangurAiTutorContent,
} from '@/features/kangur/server/ai-tutor-content-repository';
import { forbiddenError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import type { KangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';

export async function getKangurAiTutorContentHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const locale = req.nextUrl.searchParams.get('locale')?.trim() || 'pl';
  const content = await getKangurAiTutorContent(locale);

  return NextResponse.json(content, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function postKangurAiTutorContentHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can update Kangur AI Tutor content.');
  }

  const payload = await upsertKangurAiTutorContent(ctx.body as KangurAiTutorContent);

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
