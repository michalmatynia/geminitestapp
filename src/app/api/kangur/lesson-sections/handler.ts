import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { getKangurLessonSectionRepository } from '@/features/kangur/services/kangur-lesson-section-repository';
import type { KangurLessonSection } from '@/shared/contracts/kangur-lesson-sections';
import { kangurLessonAgeGroupSchema, kangurLessonSubjectSchema } from '@kangur/contracts/kangur-lesson-constants';
import { kangurLessonSectionsSchema } from '@/shared/contracts/kangur-lesson-sections';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { forbiddenError } from '@/shared/errors/app-error';
import { optionalBooleanQuerySchema, optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { clearKangurLessonsCatalogCache } from '../lessons-catalog/handler';

export const querySchema = z.object({
  subject: optionalTrimmedQueryString(kangurLessonSubjectSchema),
  ageGroup: optionalTrimmedQueryString(kangurLessonAgeGroupSchema),
  enabledOnly: optionalBooleanQuerySchema(),
});

const bodySchema = z.object({
  sections: kangurLessonSectionsSchema,
});

const KANGUR_LESSON_SECTIONS_CACHE_TTL_MS = 30_000;

type KangurLessonSectionsCacheEntry = {
  data: KangurLessonSection[];
  fetchedAt: number;
};

const kangurLessonSectionsCache = new Map<string, KangurLessonSectionsCacheEntry>();
const kangurLessonSectionsInflight = new Map<string, Promise<KangurLessonSection[]>>();

const cloneKangurLessonSections = (sections: KangurLessonSection[]): KangurLessonSection[] =>
  structuredClone(sections);

const buildKangurLessonSectionsCacheKey = (input: {
  subject?: string;
  ageGroup?: string;
  enabledOnly?: boolean;
}): string =>
  JSON.stringify({
    subject: input.subject ?? null,
    ageGroup: input.ageGroup ?? null,
    enabledOnly: input.enabledOnly === true,
  });

export const clearKangurLessonSectionsCache = (): void => {
  kangurLessonSectionsCache.clear();
  kangurLessonSectionsInflight.clear();
};

export async function getKangurLessonSectionsHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = querySchema.parse(ctx.query ?? {});
  const parsedSubject = kangurLessonSubjectSchema.safeParse(query.subject);
  const parsedAgeGroup = kangurLessonAgeGroupSchema.safeParse(query.ageGroup);
  const subject = parsedSubject.success ? parsedSubject.data : undefined;
  const ageGroup = parsedAgeGroup.success ? parsedAgeGroup.data : undefined;
  const cacheKey = buildKangurLessonSectionsCacheKey({
    subject,
    ageGroup,
    enabledOnly: query.enabledOnly,
  });
  const now = Date.now();
  const cached = kangurLessonSectionsCache.get(cacheKey);
  if (cached && now - cached.fetchedAt < KANGUR_LESSON_SECTIONS_CACHE_TTL_MS) {
    return NextResponse.json(cloneKangurLessonSections(cached.data), {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  }

  const inflight = kangurLessonSectionsInflight.get(cacheKey);
  if (inflight) {
    return NextResponse.json(cloneKangurLessonSections(await inflight), {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  }

  const repository = await getKangurLessonSectionRepository();
  const inflightPromise = repository
    .listSections({
      subject,
      ageGroup,
      enabledOnly: query.enabledOnly,
    })
    .then((sections) => {
      kangurLessonSectionsCache.set(cacheKey, {
        data: cloneKangurLessonSections(sections),
        fetchedAt: Date.now(),
      });
      return sections;
    })
    .finally(() => {
      kangurLessonSectionsInflight.delete(cacheKey);
    });
  kangurLessonSectionsInflight.set(cacheKey, inflightPromise);
  const sections = await inflightPromise;

  return NextResponse.json(sections, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
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
  clearKangurLessonSectionsCache();
  clearKangurLessonsCatalogCache();

  return NextResponse.json(sections, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
