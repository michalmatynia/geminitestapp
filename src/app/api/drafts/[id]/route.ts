export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

import { getDraft, updateDraft, deleteDraft } from '@/features/drafter/server';
import { resolveDraftCategoryId, updateDraftPayloadSchema } from '@/features/drafter/validations/draft-payload';
import type { UpdateProductDraftInput } from '@/features/products/server';
import { parseJsonBody } from '@/features/products/server';
import { notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

/**
 * GET /api/drafts/[id]
 * Get a single draft by ID
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const { id } = params;
  const draft = await getDraft(id);

  if (!draft) {
    throw notFoundError('Draft not found', { id });
  }

  return NextResponse.json(draft);
}

/**
 * PUT /api/drafts/[id]
 * Update a draft
 */
async function PUT_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const { id } = params;
  const parsed = await parseJsonBody(req, updateDraftPayloadSchema, {
    logPrefix: 'drafts.byId.PUT',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  const categoryId = resolveDraftCategoryId(data);
  const draft = await updateDraft(id, { ...data, categoryId } as UpdateProductDraftInput);

  if (!draft) {
    throw notFoundError('Draft not found', { id });
  }

  return NextResponse.json(draft);
}

/**
 * DELETE /api/drafts/[id]
 * Delete a draft
 */
async function DELETE_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const { id } = params;
  const success = await deleteDraft(id);

  if (!success) {
    throw notFoundError('Draft not found', { id });
  }

  return NextResponse.json({ success: true });
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, { source: 'drafts.[id].GET' });
export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, { source: 'drafts.[id].PUT' });
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { source: 'drafts.[id].DELETE' });
