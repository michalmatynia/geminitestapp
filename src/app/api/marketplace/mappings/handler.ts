import { NextRequest, NextResponse } from 'next/server';

import { getCategoryMappingRepository } from '@/features/integrations/server';
import {
  categoryMappingCreateInputSchema,
} from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

/**
 * GET /api/marketplace/mappings
 * Lists category mappings for a connection.
 * Query params:
 *   - connectionId (required): The integration connection ID
 *   - catalogId (optional): Filter by catalog ID
 */
export async function GET_handler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get('connectionId');
  const catalogId = searchParams.get('catalogId') ?? undefined;

  if (!connectionId) {
    throw badRequestError('connectionId is required');
  }

  const repo = await getCategoryMappingRepository();
  const mappings = await repo.listByConnection(connectionId, catalogId);

  return NextResponse.json(mappings);
}

/**
 * POST /api/marketplace/mappings
 * Creates a new category mapping.
 */
export async function POST_handler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const parsed = await parseJsonBody(request, categoryMappingCreateInputSchema, {
    logPrefix: 'marketplace.mappings.create',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const { connectionId, externalCategoryId, internalCategoryId, catalogId } = parsed.data;

  if (!connectionId || !externalCategoryId || !internalCategoryId || !catalogId) {
    throw badRequestError(
      'connectionId, externalCategoryId, internalCategoryId, and catalogId are required'
    );
  }

  const repo = await getCategoryMappingRepository();

  // Check if mapping already exists
  const existing = await repo.getByExternalCategory(connectionId, externalCategoryId, catalogId);

  if (existing) {
    // Update existing mapping
    const updated = await repo.update(existing.id, { internalCategoryId, isActive: true });
    return NextResponse.json(updated);
  }

  // Create new mapping
  const mapping = await repo.create({
    connectionId,
    externalCategoryId,
    internalCategoryId,
    catalogId,
  });

  return NextResponse.json(mapping, { status: 201 });
}
