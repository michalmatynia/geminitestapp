import { type NextRequest, NextResponse } from 'next/server';

import { deleteEmbeddingDocument } from '@/features/ai/agentcreator/server';
import type { AgentTeachingDocumentDeleteResponse } from '@/shared/contracts/agent-teaching';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';

export async function DELETE_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const documentId = ctx.params?.['documentId'];
  if (typeof documentId !== 'string' || documentId.trim().length === 0) {
    throw badRequestError('Missing documentId.');
  }
  const deleted = await deleteEmbeddingDocument(documentId);
  const response: AgentTeachingDocumentDeleteResponse = { success: true, ok: true, deleted };
  return NextResponse.json(response);
}
