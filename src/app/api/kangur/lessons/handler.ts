import { NextRequest, NextResponse } from 'next/server';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { getKangurLessonRepository } from '@/features/kangur/services/kangur-lesson-repository';
import {
  kangurLessonAgeGroupSchema,
  kangurLessonsQuerySchema,
  kangurLessonsReplacePayloadSchema,
  kangurLessonSubjectSchema,
} from '@/shared/contracts/kangur';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError } from '@/shared/errors/app-error';

export { kangurLessonsQuerySchema as querySchema };
export { kangurLessonsReplacePayloadSchema as bodySchema };

export async function getKangurLessonsHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = kangurLessonsQuerySchema.parse(ctx.query ?? {});
  const parsedSubject = kangurLessonSubjectSchema.safeParse(query.subject);
  const parsedAgeGroup = kangurLessonAgeGroupSchema.safeParse(query.ageGroup);
  const subject = parsedSubject.success ? parsedSubject.data : undefined;
  const ageGroup = parsedAgeGroup.success ? parsedAgeGroup.data : undefined;
  const repository = await getKangurLessonRepository();
  const lessons = await repository.listLessons({
    subject,
    ageGroup,
    enabledOnly: query.enabledOnly,
  });

  return NextResponse.json(lessons, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
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

  const parsed = kangurLessonsReplacePayloadSchema.parse(ctx.body ?? {});
  const repository = await getKangurLessonRepository();
  const lessons = await repository.replaceLessons(parsed.lessons);

  return NextResponse.json(lessons, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
