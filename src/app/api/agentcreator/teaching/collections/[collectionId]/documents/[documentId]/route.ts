export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { deleteEmbeddingDocument } from '@/features/ai/agentcreator/teaching/server/repository';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

type Params = { collectionId: string; documentId: string };

async function DELETE_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const params = ctx.params as unknown as Params | undefined;
  const documentId = params?.documentId;
  if (!documentId) throw badRequestError('Missing documentId.');
  const deleted = await deleteEmbeddingDocument(documentId);
  return NextResponse.json({ ok: true, deleted });
}

export const DELETE = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => DELETE_handler(req, ctx),
  { source: 'agentcreator.teaching.documents.DELETE' }
);

