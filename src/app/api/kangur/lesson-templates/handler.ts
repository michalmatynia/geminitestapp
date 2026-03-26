import { NextRequest, NextResponse } from 'next/server';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { getKangurLessonTemplateRepository } from '@/features/kangur/services/kangur-lesson-template-repository';
import type { KangurLessonTemplate } from '@/shared/contracts/kangur-lesson-templates';
import { kangurLessonSubjectSchema } from '@/shared/contracts/kangur';
import {
  kangurLessonTemplatesQuerySchema,
  kangurLessonTemplatesReplacePayloadSchema,
} from '@/shared/contracts/kangur-lesson-templates';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError } from '@/shared/errors/app-error';

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

const buildKangurLessonTemplatesCacheKey = (input: { subject?: string }): string =>
  JSON.stringify({
    subject: input.subject ?? null,
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
  const parsedSubject = kangurLessonSubjectSchema.safeParse(query.subject);
  const subject = parsedSubject.success ? parsedSubject.data : undefined;
  const cacheKey = buildKangurLessonTemplatesCacheKey({ subject });
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
    .listTemplates({ subject })
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
  const repository = await getKangurLessonTemplateRepository();
  const templates = await repository.replaceTemplates(parsed.templates);
  clearKangurLessonTemplatesCache();

  return NextResponse.json(templates, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
