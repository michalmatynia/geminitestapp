import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { getKangurLessonRepository } from '@/features/kangur/services/kangur-lesson-repository';
import { kangurLessonSubjectSchema, kangurLessonsSchema } from '@/features/kangur/shared/contracts/kangur';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError } from '@/shared/errors/app-error';
import { optionalBooleanQuerySchema, optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  subject: optionalTrimmedQueryString(kangurLessonSubjectSchema),
  enabledOnly: optionalBooleanQuerySchema(),
});

const bodySchema = z.object({
  lessons: kangurLessonsSchema,
});

export async function getKangurLessonsHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = querySchema.parse(ctx.query ?? {});
  const parsedSubject = kangurLessonSubjectSchema.safeParse(query.subject);
  const subject = parsedSubject.success ? parsedSubject.data : undefined;
  const repository = await getKangurLessonRepository();
  const lessons = await repository.listLessons({
    subject,
    enabledOnly: query.enabledOnly,
  });

  return NextResponse.json(lessons, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function postKangurLessonsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can update Kangur lessons.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  const repository = await getKangurLessonRepository();
  const lessons = await repository.replaceLessons(parsed.lessons);

  return NextResponse.json(lessons, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
