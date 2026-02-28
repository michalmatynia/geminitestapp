import { NextRequest, NextResponse } from 'next/server';

import { getCategoryMappingRepository } from '@/shared/lib/integrations/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

type CreateMappingRequest = {
  connectionId: string;
  externalCategoryId: string;
  internalCategoryId: string;
  catalogId: string;
};

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

  const repo = getCategoryMappingRepository();
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
  const body = (await request.json()) as CreateMappingRequest;
  const { connectionId, externalCategoryId, internalCategoryId, catalogId } = body;

  if (!connectionId || !externalCategoryId || !internalCategoryId || !catalogId) {
    throw badRequestError(
      'connectionId, externalCategoryId, internalCategoryId, and catalogId are required'
    );
  }

  const repo = getCategoryMappingRepository();

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
