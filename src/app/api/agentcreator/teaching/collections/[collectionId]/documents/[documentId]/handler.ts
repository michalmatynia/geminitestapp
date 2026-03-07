import { NextRequest, NextResponse } from 'next/server';

import { deleteEmbeddingDocument } from '@/features/ai/agentcreator/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

type Params = { collectionId: string; documentId: string };

export async function DELETE_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const params = ctx.params as unknown as Params | undefined;
  const documentId = params?.documentId;
  if (!documentId) throw badRequestError('Missing documentId.');
  const deleted = await deleteEmbeddingDocument(documentId);
  return NextResponse.json({ ok: true, deleted });
}
