import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { getKangurLessonDocumentRepository } from '@/features/kangur/services/kangur-lesson-document-repository';
import { kangurLessonDocumentStoreSchema } from '@kangur/contracts';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError } from '@/shared/errors/app-error';

const bodySchema = z.object({
  documents: kangurLessonDocumentStoreSchema,
});

export async function getKangurLessonDocumentsHandler(): Promise<Response> {
  const repository = await getKangurLessonDocumentRepository();
  const documents = await repository.listLessonDocuments();

  return NextResponse.json(documents, {
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
  const repository = await getKangurLessonDocumentRepository();
  const documents = await repository.replaceLessonDocuments(parsed.documents);

  return NextResponse.json(documents, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
