import { NextRequest, NextResponse } from 'next/server';

import { getCategoryMappingRepository } from '@/features/integrations/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';

type UpdateMappingRequest = {
  internalCategoryId?: string;
  isActive?: boolean;
};

type Params = { id: string };

/**
 * GET /api/marketplace/mappings/[id]
 * Gets a specific category mapping by ID.
 */
export async function GET_handler(
  _request: NextRequest,
  _ctx: ApiHandlerContext,
  params: Params
): Promise<Response> {
  const { id } = params;

  const repo = await getCategoryMappingRepository();
  const mapping = await repo.getById(id);

  if (!mapping) {
    throw notFoundError('Mapping not found');
  }

  return NextResponse.json(mapping);
}

/**
 * PUT /api/marketplace/mappings/[id]
 * Updates a category mapping.
 */
export async function PUT_handler(
  request: NextRequest,
  _ctx: ApiHandlerContext,
  params: Params
): Promise<Response> {
  const { id } = params;
  const body = (await request.json()) as UpdateMappingRequest;

  const repo = await getCategoryMappingRepository();

  // Check if mapping exists
  const existing = await repo.getById(id);
  if (!existing) {
    throw notFoundError('Mapping not found');
  }

  const updated = await repo.update(id, {
    ...(body.internalCategoryId !== undefined && {
      internalCategoryId: body.internalCategoryId,
    }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
  });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/marketplace/mappings/[id]
 * Deletes a category mapping.
 */
export async function DELETE_handler(
  _request: NextRequest,
  _ctx: ApiHandlerContext,
  params: Params
): Promise<Response> {
  const { id } = params;

  const repo = await getCategoryMappingRepository();

  // Check if mapping exists
  const existing = await repo.getById(id);
  if (!existing) {
    throw notFoundError('Mapping not found');
  }

  await repo.delete(id);

  return NextResponse.json({ success: true });
}
