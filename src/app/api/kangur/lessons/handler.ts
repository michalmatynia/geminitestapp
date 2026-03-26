import { NextRequest, NextResponse } from 'next/server';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { getKangurLessonRepository } from '@/features/kangur/services/kangur-lesson-repository';
import type { KangurLesson } from '@kangur/contracts';
import {
  kangurLessonAgeGroupSchema,
  kangurLessonsQuerySchema,
  kangurLessonsReplacePayloadSchema,
  kangurLessonSubjectSchema,
} from '@/shared/contracts/kangur';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError } from '@/shared/errors/app-error';
import { clearKangurLessonsCatalogCache } from '../lessons-catalog/handler';

export { kangurLessonsQuerySchema as querySchema };
export { kangurLessonsReplacePayloadSchema as bodySchema };

const KANGUR_LESSONS_CACHE_TTL_MS = 30_000;

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
  enabledOnly?: boolean;
}): string =>
  JSON.stringify({
    subject: input.subject ?? null,
    ageGroup: input.ageGroup ?? null,
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
  const subject = parsedSubject.success ? parsedSubject.data : undefined;
  const ageGroup = parsedAgeGroup.success ? parsedAgeGroup.data : undefined;
  const cacheKey = buildKangurLessonsCacheKey({
    subject,
    ageGroup,
    enabledOnly: query.enabledOnly,
  });
  const now = Date.now();
  const cached = kangurLessonsCache.get(cacheKey);
  if (cached && now - cached.fetchedAt < KANGUR_LESSONS_CACHE_TTL_MS) {
    return NextResponse.json(cloneKangurLessons(cached.data), {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  }

  const inflight = kangurLessonsInflight.get(cacheKey);
  if (inflight) {
    return NextResponse.json(cloneKangurLessons(await inflight), {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  }

  const repository = await getKangurLessonRepository();
  const inflightPromise = repository
    .listLessons({
      subject,
      ageGroup,
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
  clearKangurLessonsCache();
  clearKangurLessonsCatalogCache();

  return NextResponse.json(lessons, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
