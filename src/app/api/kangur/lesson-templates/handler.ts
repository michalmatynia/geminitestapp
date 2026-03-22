import { NextRequest, NextResponse } from 'next/server';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { getKangurLessonTemplateRepository } from '@/features/kangur/services/kangur-lesson-template-repository';
import { kangurLessonSubjectSchema } from '@/shared/contracts/kangur';
import {
  kangurLessonTemplatesQuerySchema,
  kangurLessonTemplatesReplacePayloadSchema,
} from '@/shared/contracts/kangur-lesson-templates';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError } from '@/shared/errors/app-error';

export { kangurLessonTemplatesQuerySchema as querySchema };
export { kangurLessonTemplatesReplacePayloadSchema as bodySchema };

export async function getKangurLessonTemplatesHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
): Promise<Response> {
  const query = kangurLessonTemplatesQuerySchema.parse(ctx.query ?? {});
  const parsedSubject = kangurLessonSubjectSchema.safeParse(query.subject);
  const subject = parsedSubject.success ? parsedSubject.data : undefined;
  const repository = await getKangurLessonTemplateRepository();
  const templates = await repository.listTemplates({ subject });

  return NextResponse.json(templates, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}

export async function postKangurLessonTemplatesHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can update Kangur lesson templates.');
  }

  const parsed = kangurLessonTemplatesReplacePayloadSchema.parse(ctx.body ?? {});
  const repository = await getKangurLessonTemplateRepository();
  const templates = await repository.replaceTemplates(parsed.templates);

  return NextResponse.json(templates, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
