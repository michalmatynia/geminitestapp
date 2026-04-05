import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getProducerMappingRepository } from '@/features/integrations/server';
import { producerMappingCreateInputSchema } from '@/shared/contracts/integrations/producers';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

const querySchema = z.object({
  connectionId: optionalTrimmedQueryString(),
});

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
  const query = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!query.success) {
    throw badRequestError('Invalid marketplace producer mappings query.', {
      errors: query.error.flatten(),
    });
  }

  const { connectionId } = query.data;

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
  const parsed = await parseJsonBody(request, producerMappingCreateInputSchema, {
    logPrefix: 'marketplace.producer-mappings.create',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const { connectionId, externalProducerId, internalProducerId } = parsed.data;

  if (!connectionId || !externalProducerId || !internalProducerId) {
    throw badRequestError('connectionId, externalProducerId, and internalProducerId are required');
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
