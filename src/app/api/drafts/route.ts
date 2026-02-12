export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 10;

import { NextRequest, NextResponse } from 'next/server';

import { listDrafts, createDraft } from '@/features/drafter/server';
import { createDraftPayloadSchema, resolveDraftCategoryId } from '@/features/drafter/validations/draft-payload';
import type { CreateProductDraftInput } from '@/features/products/server';
import { parseJsonBody } from '@/features/products/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

/**
 * GET /api/drafts
 * List all product drafts
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const drafts = await listDrafts();
  return NextResponse.json(drafts);
}

/**
 * POST /api/drafts
 * Create a new product draft
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, createDraftPayloadSchema, {
    logPrefix: 'drafts.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  const categoryId = resolveDraftCategoryId(data);
  const draft = await createDraft({
    ...data,
    categoryId,
  } as CreateProductDraftInput);
  return NextResponse.json(draft, { status: 201 });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'drafts.GET' });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'drafts.POST' });
