import { type NextRequest, NextResponse } from 'next/server';

import { getDraft, updateDraft, deleteDraft } from '@/features/drafter/server';
import {
  updateDraftPayloadSchema,
  resolveDraftCategoryId,
} from '@/features/drafter/validations/draft-payload';
import type { UpdateProductDraftInput } from '@/features/products/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';

/**
 * GET /api/drafts/[id]
 * Get a single product draft by ID
 */
export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const draft = await getDraft(params.id);
  if (!draft) {
    throw notFoundError('Draft not found.', { draftId: params.id });
  }
  return NextResponse.json(draft);
}

/**
 * PUT /api/drafts/[id]
 * Update a product draft by ID
 */
export async function putHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const parsed = await parseJsonBody(req, updateDraftPayloadSchema, {
    logPrefix: 'drafts.[id].PUT',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  const categoryId = resolveDraftCategoryId(data);
  const updated = await updateDraft(params.id, {
    ...data,
    ...(categoryId !== undefined ? { categoryId } : {}),
  } as UpdateProductDraftInput);
  if (!updated) {
    throw notFoundError('Draft not found.', { draftId: params.id });
  }
  return NextResponse.json(updated);
}

/**
 * DELETE /api/drafts/[id]
 * Delete a product draft by ID
 */
export async function deleteHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  await deleteDraft(params.id);
  return NextResponse.json({ ok: true });
}
