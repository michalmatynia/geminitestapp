import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { getKangurLessonDocumentRepository } from '@/features/kangur/services/kangur-lesson-document-repository';
import { kangurLessonDocumentStoreSchema } from '@kangur/contracts/kangur';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { forbiddenError } from '@/shared/errors/app-error';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

const bodySchema = z.object({
  locale: z.string().trim().min(2).max(16).optional(),
  documents: kangurLessonDocumentStoreSchema,
});

export async function getKangurLessonDocumentsHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = (ctx.query ?? {}) as Record<string, unknown>;
  const localeParam = typeof query['locale'] === 'string' ? query['locale'].trim() : '';
  const locale = normalizeSiteLocale(localeParam || undefined);
  const repository = await getKangurLessonDocumentRepository();
  const documents = await repository.listLessonDocuments(locale);

  return NextResponse.json(documents, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}

export async function getKangurLessonDocumentHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const lessonId = String(ctx.params?.['lessonId'] ?? '').trim();
  const query = (ctx.query ?? {}) as Record<string, unknown>;
  const localeParam = typeof query['locale'] === 'string' ? query['locale'].trim() : '';
  const locale = normalizeSiteLocale(localeParam || undefined);
  const repository = await getKangurLessonDocumentRepository();
  const document = lessonId ? await repository.getLessonDocument(lessonId, locale) : null;

  return NextResponse.json(document, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}

export async function postKangurLessonDocumentsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can update Kangur lesson documents.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  const locale = normalizeSiteLocale(parsed.locale);
  const repository = await getKangurLessonDocumentRepository();
  const documents = await repository.replaceLessonDocuments(parsed.documents, locale);

  return NextResponse.json(documents, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
