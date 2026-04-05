import { NextRequest, NextResponse } from 'next/server';

import { listDrafts, createDraft } from '@/features/drafter/server';
import {
  createDraftPayloadSchema,
  resolveDraftCategoryId,
} from '@/features/drafter/validations/draft-payload';
import type { CreateProductDraftInput } from '@/features/products/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

/**
 * GET /api/drafts
 * List all product drafts
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const drafts = await listDrafts();
  return NextResponse.json(drafts);
}

/**
 * POST /api/drafts
 * Create a new product draft
 */
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
