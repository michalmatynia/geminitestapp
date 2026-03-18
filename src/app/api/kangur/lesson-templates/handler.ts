import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { getKangurLessonTemplateRepository } from '@/features/kangur/services/kangur-lesson-template-repository';
import { kangurLessonSubjectSchema } from '@/features/kangur/shared/contracts/kangur';
import { kangurLessonTemplatesSchema } from '@/shared/contracts/kangur-lesson-templates';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError } from '@/shared/errors/app-error';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  subject: optionalTrimmedQueryString(kangurLessonSubjectSchema),
});

const bodySchema = z.object({
  templates: kangurLessonTemplatesSchema,
});

export async function getKangurLessonTemplatesHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
): Promise<Response> {
  const query = querySchema.parse(ctx.query ?? {});
  const parsedSubject = kangurLessonSubjectSchema.safeParse(query.subject);
  const subject = parsedSubject.success ? parsedSubject.data : undefined;
  const repository = await getKangurLessonTemplateRepository();
  const templates = await repository.listTemplates({ subject });

  return NextResponse.json(templates, {
    headers: {
      'Cache-Control': 'no-store',
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

  const parsed = bodySchema.parse(ctx.body ?? {});
  const repository = await getKangurLessonTemplateRepository();
  const templates = await repository.replaceTemplates(parsed.templates);

  return NextResponse.json(templates, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
