import { NextRequest, NextResponse } from 'next/server';

import { getProducerMappingRepository } from '@/features/integrations/server';
import { badRequestError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/types/api/api';

type CreateProducerMappingRequest = {
  connectionId: string;
  externalProducerId: string;
  internalProducerId: string;
};

/**
 * GET /api/marketplace/producer-mappings
 * Lists producer mappings for a connection.
 * Query params:
 *   - connectionId (required): The integration connection ID
 */
export async function GET_handler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get('connectionId');

  if (!connectionId) {
    throw badRequestError('connectionId is required');
  }

  const repo = getProducerMappingRepository();
  const mappings = await repo.listByConnection(connectionId);
  return NextResponse.json(mappings);
}

/**
 * POST /api/marketplace/producer-mappings
 * Creates or updates a producer mapping.
 */
export async function POST_handler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const body = (await request.json()) as CreateProducerMappingRequest;
  const { connectionId, externalProducerId, internalProducerId } = body;

  if (!connectionId || !externalProducerId || !internalProducerId) {
    throw badRequestError(
      'connectionId, externalProducerId, and internalProducerId are required'
    );
  }

  const repo = getProducerMappingRepository();

  const existing = await repo.getByInternalProducer(connectionId, internalProducerId);
  if (existing) {
    const updated = await repo.update(existing.id, {
      externalProducerId,
      isActive: true,
    });
    return NextResponse.json(updated);
  }

  const mapping = await repo.create({
    connectionId,
    externalProducerId,
    internalProducerId,
  });
  return NextResponse.json(mapping, { status: 201 });
}
