import { NextRequest, NextResponse } from 'next/server';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { getKangurLessonTemplateRepository } from '@/features/kangur/services/kangur-lesson-template-repository';
import type { KangurLessonTemplate } from '@/shared/contracts/kangur-lesson-templates';
import {
  kangurLessonAgeGroupSchema,
  kangurLessonComponentIdSchema,
  kangurLessonSubjectSchema,
} from '@/shared/contracts/kangur';
import {
  kangurLessonTemplatesQuerySchema,
  kangurLessonTemplatesReplacePayloadSchema,
} from '@/shared/contracts/kangur-lesson-templates';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { forbiddenError } from '@/shared/errors/app-error';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

export { kangurLessonTemplatesQuerySchema as querySchema };
export { kangurLessonTemplatesReplacePayloadSchema as bodySchema };

const KANGUR_LESSON_TEMPLATES_CACHE_TTL_MS = 30_000;

type KangurLessonTemplatesCacheEntry = {
  data: KangurLessonTemplate[];
  fetchedAt: number;
};

const kangurLessonTemplatesCache = new Map<string, KangurLessonTemplatesCacheEntry>();
const kangurLessonTemplatesInflight = new Map<string, Promise<KangurLessonTemplate[]>>();

const cloneKangurLessonTemplates = (
  templates: KangurLessonTemplate[]
): KangurLessonTemplate[] => structuredClone(templates);

const buildKangurLessonTemplatesCacheKey = (input: {
  componentId?: string | null;
  locale?: string | null;
  subject?: string | null;
  ageGroup?: string | null;
}): string =>
  JSON.stringify({
    componentId: input.componentId ?? null,
    locale: input.locale ?? 'pl',
    subject: input.subject ?? null,
    ageGroup: input.ageGroup ?? null,
  });

export const clearKangurLessonTemplatesCache = (): void => {
  kangurLessonTemplatesCache.clear();
  kangurLessonTemplatesInflight.clear();
};

export async function getKangurLessonTemplatesHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
): Promise<Response> {
  const query = kangurLessonTemplatesQuerySchema.parse(ctx.query ?? {});
  const parsedComponentId = kangurLessonComponentIdSchema.safeParse(query.componentId);
  const componentId = parsedComponentId.success ? parsedComponentId.data : undefined;
  const parsedSubject = kangurLessonSubjectSchema.safeParse(query.subject);
  const subject = parsedSubject.success ? parsedSubject.data : undefined;
  const parsedAgeGroup = kangurLessonAgeGroupSchema.safeParse(query.ageGroup);
  const ageGroup = parsedAgeGroup.success ? parsedAgeGroup.data : undefined;
  const locale = normalizeSiteLocale(query.locale);
  const cacheKey = buildKangurLessonTemplatesCacheKey({
    componentId: componentId ?? null,
    subject: subject ?? null,
    ageGroup: ageGroup ?? null,
    locale,
  });
  const now = Date.now();
  const cached = kangurLessonTemplatesCache.get(cacheKey);
  if (cached && now - cached.fetchedAt < KANGUR_LESSON_TEMPLATES_CACHE_TTL_MS) {
    return NextResponse.json(cloneKangurLessonTemplates(cached.data), {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  }

  const inflight = kangurLessonTemplatesInflight.get(cacheKey);
  if (inflight) {
    return NextResponse.json(cloneKangurLessonTemplates(await inflight), {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  }

  const repository = await getKangurLessonTemplateRepository();
  const inflightPromise = repository
    .listTemplates({ locale, componentId, subject, ageGroup })
    .then((templates) => {
      kangurLessonTemplatesCache.set(cacheKey, {
        data: cloneKangurLessonTemplates(templates),
        fetchedAt: Date.now(),
      });
      return templates;
    })
    .finally(() => {
      kangurLessonTemplatesInflight.delete(cacheKey);
    });
  kangurLessonTemplatesInflight.set(cacheKey, inflightPromise);
  const templates = await inflightPromise;

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
  const locale = normalizeSiteLocale(parsed.locale);
  const repository = await getKangurLessonTemplateRepository();
  const templates = await repository.replaceTemplates(parsed.templates, locale);
  clearKangurLessonTemplatesCache();

  return NextResponse.json(templates, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
