import { NextRequest, NextResponse } from 'next/server';

import { getProducerMappingRepository } from '@/features/integrations/server';
import {
  bulkProducerMappingRequestSchema,
  type MarketplaceBulkUpsertResponse,
} from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

/**
 * POST /api/marketplace/producer-mappings/bulk
 * Creates or updates multiple producer mappings at once.
 */
export async function POST_handler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const parsed = await parseJsonBody(request, bulkProducerMappingRequestSchema, {
    logPrefix: 'marketplace.producer-mappings.bulk',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const { connectionId, mappings } = parsed.data;

  const repo = getProducerMappingRepository();
  const upsertedCount = await repo.bulkUpsert(connectionId, mappings);

  const response: MarketplaceBulkUpsertResponse = {
    success: true,
    upserted: upsertedCount,
    message: `Successfully saved ${upsertedCount} producer mappings`,
  };

  return NextResponse.json(response);
}
