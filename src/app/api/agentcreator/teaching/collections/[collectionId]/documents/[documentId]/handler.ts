import { NextRequest, NextResponse } from 'next/server';

import { deleteEmbeddingDocument } from '@/features/ai/agentcreator/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export async function DELETE_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const documentId = ctx.params?.['documentId'];
  if (typeof documentId !== 'string' || !documentId.trim()) {
    throw badRequestError('Missing documentId.');
  }
  const deleted = await deleteEmbeddingDocument(documentId);
  return NextResponse.json({ ok: true, deleted });
}
