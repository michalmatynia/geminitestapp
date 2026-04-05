import { NextRequest, NextResponse } from 'next/server';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { getKangurLessonRepository } from '@/features/kangur/services/kangur-lesson-repository';
import type { KangurLesson } from '@kangur/contracts/kangur';
import {
  kangurLessonAgeGroupSchema,
  kangurLessonComponentIdSchema,
  kangurLessonsQuerySchema,
  kangurLessonsReplacePayloadSchema,
  kangurLessonSubjectSchema,
} from '@/shared/contracts/kangur';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { forbiddenError } from '@/shared/errors/app-error';
import { clearKangurLessonsCatalogCache } from '../lessons-catalog/handler';

export { kangurLessonsQuerySchema as querySchema };
export { kangurLessonsReplacePayloadSchema as bodySchema };

const KANGUR_LESSONS_CACHE_TTL_MS = 30_000;
const KANGUR_LESSONS_RESPONSE_CACHE_CONTROL = 'no-store';

type KangurLessonsCacheEntry = {
  data: KangurLesson[];
  fetchedAt: number;
};

const kangurLessonsCache = new Map<string, KangurLessonsCacheEntry>();
const kangurLessonsInflight = new Map<string, Promise<KangurLesson[]>>();

const cloneKangurLessons = (lessons: KangurLesson[]): KangurLesson[] => structuredClone(lessons);

const buildKangurLessonsCacheKey = (input: {
  subject?: string;
  ageGroup?: string;
  componentIds?: string[];
  enabledOnly?: boolean;
}): string =>
  JSON.stringify({
    subject: input.subject ?? null,
    ageGroup: input.ageGroup ?? null,
    componentIds: input.componentIds ?? null,
    enabledOnly: input.enabledOnly === true,
  });

export const clearKangurLessonsCache = (): void => {
  kangurLessonsCache.clear();
  kangurLessonsInflight.clear();
};

export async function getKangurLessonsHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = kangurLessonsQuerySchema.parse(ctx.query ?? {});
  const parsedSubject = kangurLessonSubjectSchema.safeParse(query.subject);
  const parsedAgeGroup = kangurLessonAgeGroupSchema.safeParse(query.ageGroup);
  const parsedComponentIds = kangurLessonComponentIdSchema.array().safeParse(query.componentIds);
  const subject = parsedSubject.success ? parsedSubject.data : undefined;
  const ageGroup = parsedAgeGroup.success ? parsedAgeGroup.data : undefined;
  const componentIds = parsedComponentIds.success ? parsedComponentIds.data : undefined;
  const cacheKey = buildKangurLessonsCacheKey({
    subject,
    ageGroup,
    componentIds,
    enabledOnly: query.enabledOnly,
  });
  const now = Date.now();
  const cached = kangurLessonsCache.get(cacheKey);
  if (cached && now - cached.fetchedAt < KANGUR_LESSONS_CACHE_TTL_MS) {
    return NextResponse.json(cloneKangurLessons(cached.data), {
      headers: {
        'Cache-Control': KANGUR_LESSONS_RESPONSE_CACHE_CONTROL,
      },
    });
  }

  const inflight = kangurLessonsInflight.get(cacheKey);
  if (inflight) {
    return NextResponse.json(cloneKangurLessons(await inflight), {
      headers: {
        'Cache-Control': KANGUR_LESSONS_RESPONSE_CACHE_CONTROL,
      },
    });
  }

  const repository = await getKangurLessonRepository();
  const inflightPromise = repository
    .listLessons({
      subject,
      ageGroup,
      componentIds,
      enabledOnly: query.enabledOnly,
    })
    .then((lessons) => {
      kangurLessonsCache.set(cacheKey, {
        data: cloneKangurLessons(lessons),
        fetchedAt: Date.now(),
      });
      return lessons;
    })
    .finally(() => {
      kangurLessonsInflight.delete(cacheKey);
    });
  kangurLessonsInflight.set(cacheKey, inflightPromise);
  const lessons = await inflightPromise;

  return NextResponse.json(lessons, {
    headers: {
      'Cache-Control': KANGUR_LESSONS_RESPONSE_CACHE_CONTROL,
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
  clearKangurLessonsCache();
  clearKangurLessonsCatalogCache();

  return NextResponse.json(lessons, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
