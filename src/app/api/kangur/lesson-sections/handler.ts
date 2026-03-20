import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { getKangurLessonSectionRepository } from '@/features/kangur/services/kangur-lesson-section-repository';
import {
  kangurLessonAgeGroupSchema,
  kangurLessonSubjectSchema,
} from '@kangur/contracts';
import { kangurLessonSectionsSchema } from '@/shared/contracts/kangur-lesson-sections';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError } from '@/shared/errors/app-error';
import { optionalBooleanQuerySchema, optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  subject: optionalTrimmedQueryString(kangurLessonSubjectSchema),
  ageGroup: optionalTrimmedQueryString(kangurLessonAgeGroupSchema),
  enabledOnly: optionalBooleanQuerySchema(),
});

const bodySchema = z.object({
  sections: kangurLessonSectionsSchema,
});

export async function getKangurLessonSectionsHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = querySchema.parse(ctx.query ?? {});
  const parsedSubject = kangurLessonSubjectSchema.safeParse(query.subject);
  const parsedAgeGroup = kangurLessonAgeGroupSchema.safeParse(query.ageGroup);
  const subject = parsedSubject.success ? parsedSubject.data : undefined;
  const ageGroup = parsedAgeGroup.success ? parsedAgeGroup.data : undefined;
  const repository = await getKangurLessonSectionRepository();
  const sections = await repository.listSections({
    subject,
    ageGroup,
    enabledOnly: query.enabledOnly,
  });

  return NextResponse.json(sections, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function postKangurLessonSectionsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can update Kangur lesson sections.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  const repository = await getKangurLessonSectionRepository();
  const sections = await repository.replaceSections(parsed.sections);

  return NextResponse.json(sections, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
