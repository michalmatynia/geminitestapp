import { NextRequest, NextResponse } from 'next/server';

import { getKangurLessonRepository } from '@/features/kangur/services/kangur-lesson-repository';
import { getKangurLessonSectionRepository } from '@/features/kangur/services/kangur-lesson-section-repository';
import {
  kangurLessonAgeGroupSchema,
  kangurLessonsCatalogSchema,
  kangurLessonsQuerySchema,
  kangurLessonSubjectSchema,
  type KangurLessonsCatalog,
} from '@/shared/contracts/kangur';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export { kangurLessonsQuerySchema as querySchema };

const KANGUR_LESSONS_CATALOG_CACHE_TTL_MS = 30_000;

type KangurLessonsCatalogCacheEntry = {
  data: KangurLessonsCatalog;
  fetchedAt: number;
};

const kangurLessonsCatalogCache = new Map<string, KangurLessonsCatalogCacheEntry>();
const kangurLessonsCatalogInflight = new Map<string, Promise<KangurLessonsCatalog>>();

const cloneKangurLessonsCatalog = (catalog: KangurLessonsCatalog): KangurLessonsCatalog =>
  structuredClone(catalog);

const buildKangurLessonsCatalogCacheKey = (input: {
  subject?: string;
  ageGroup?: string;
  enabledOnly?: boolean;
}): string =>
  JSON.stringify({
    subject: input.subject ?? null,
    ageGroup: input.ageGroup ?? null,
    enabledOnly: input.enabledOnly === true,
  });

export const clearKangurLessonsCatalogCache = (): void => {
  kangurLessonsCatalogCache.clear();
  kangurLessonsCatalogInflight.clear();
};

export async function getKangurLessonsCatalogHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = kangurLessonsQuerySchema.parse(ctx.query ?? {});
  const parsedSubject = kangurLessonSubjectSchema.safeParse(query.subject);
  const parsedAgeGroup = kangurLessonAgeGroupSchema.safeParse(query.ageGroup);
  const subject = parsedSubject.success ? parsedSubject.data : undefined;
  const ageGroup = parsedAgeGroup.success ? parsedAgeGroup.data : undefined;
  const cacheKey = buildKangurLessonsCatalogCacheKey({
    subject,
    ageGroup,
    enabledOnly: query.enabledOnly,
  });
  const now = Date.now();
  const cached = kangurLessonsCatalogCache.get(cacheKey);

  if (cached && now - cached.fetchedAt < KANGUR_LESSONS_CATALOG_CACHE_TTL_MS) {
    return NextResponse.json(cloneKangurLessonsCatalog(cached.data), {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  }

  const inflight = kangurLessonsCatalogInflight.get(cacheKey);
  if (inflight) {
    return NextResponse.json(cloneKangurLessonsCatalog(await inflight), {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  }

  const lessonsRepository = await getKangurLessonRepository();
  const lessonSectionsRepository = await getKangurLessonSectionRepository();
  const inflightPromise = Promise.all([
    lessonsRepository.listLessons({
      subject,
      ageGroup,
      enabledOnly: query.enabledOnly,
    }),
    lessonSectionsRepository.listSections({
      subject,
      ageGroup,
      enabledOnly: query.enabledOnly,
    }),
  ])
    .then(([lessons, sections]) => {
      const next = kangurLessonsCatalogSchema.parse({ lessons, sections });
      kangurLessonsCatalogCache.set(cacheKey, {
        data: cloneKangurLessonsCatalog(next),
        fetchedAt: Date.now(),
      });
      return next;
    })
    .finally(() => {
      kangurLessonsCatalogInflight.delete(cacheKey);
    });

  kangurLessonsCatalogInflight.set(cacheKey, inflightPromise);
  const catalog = await inflightPromise;

  return NextResponse.json(catalog, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}
