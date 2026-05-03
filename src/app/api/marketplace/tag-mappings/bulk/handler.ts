import { type NextRequest, NextResponse } from 'next/server';

import { getTagMappingRepository } from '@/features/integrations/server';
import { bulkTagMappingRequestSchema } from '@/shared/contracts/integrations/listings';
import { type MarketplaceBulkUpsertResponse } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

/**
 * POST /api/marketplace/tag-mappings/bulk
 * Creates or updates multiple tag mappings at once.
 */
export async function postHandler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const parsed = await parseJsonBody(request, bulkTagMappingRequestSchema, {
    logPrefix: 'marketplace.tag-mappings.bulk',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const { connectionId, mappings } = parsed.data;

  const repo = getTagMappingRepository();
  const upsertedCount = await repo.bulkUpsert(connectionId, mappings);

  const response: MarketplaceBulkUpsertResponse = {
    success: true,
    upserted: upsertedCount,
    message: `Successfully saved ${upsertedCount} tag mappings`,
  };

  return NextResponse.json(response);
}
