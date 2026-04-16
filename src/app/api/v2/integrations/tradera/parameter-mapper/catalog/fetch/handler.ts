import { type NextRequest, NextResponse } from 'next/server';

import { fetchAndStoreTraderaParameterMapperCatalog } from '@/features/integrations/services/tradera-listing/parameter-mapper-catalog';
import {
  traderaParameterMapperCatalogFetchRequestSchema,
  type TraderaParameterMapperCatalogFetchRequest,
} from '@/shared/contracts/integrations/tradera-parameter-mapper';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

export { traderaParameterMapperCatalogFetchRequestSchema };

export async function POST_handler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const parsed = await parseJsonBody(request, traderaParameterMapperCatalogFetchRequestSchema, {
    logPrefix: 'v2.integrations.tradera.parameter-mapper.catalog.fetch',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const body: TraderaParameterMapperCatalogFetchRequest = parsed.data;
  const response = await fetchAndStoreTraderaParameterMapperCatalog({
    connectionId: body.connectionId,
    externalCategoryId: body.externalCategoryId,
  });

  return NextResponse.json(response);
}
