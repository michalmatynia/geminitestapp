import { NextRequest, NextResponse } from 'next/server';

import { getCategoryMappingRepository } from '@/features/integrations/services/category-mapping-repository';
import {
  bulkCategoryMappingRequestSchema,
  type MarketplaceBulkUpsertResponse,
} from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

/**
 * POST /api/marketplace/mappings/bulk
 * Creates or updates multiple category mappings at once.
 */
export async function POST_handler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const parsed = await parseJsonBody(request, bulkCategoryMappingRequestSchema, {
    logPrefix: 'marketplace.mappings.bulk',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const { connectionId, catalogId, mappings } = parsed.data;

  const repo = getCategoryMappingRepository();
  const upsertedCount = await repo.bulkUpsert(connectionId, catalogId, mappings);

  const response: MarketplaceBulkUpsertResponse = {
    success: true,
    upserted: upsertedCount,
    message: `Successfully saved ${upsertedCount} category mappings`,
  };

  return NextResponse.json(response);
}
