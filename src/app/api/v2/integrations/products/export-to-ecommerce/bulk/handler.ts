import { type NextRequest, NextResponse } from 'next/server';

import { exportProductsToEcommerce } from '@/features/integrations/server';
import {
  ecommerceProductBulkExportRequestSchema,
  type EcommerceProductBulkExportRequest,
} from '@/shared/contracts/integrations/ecommerce-export';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export const bulkSchema = ecommerceProductBulkExportRequestSchema;

export async function postBulkExportToEcommerceHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as EcommerceProductBulkExportRequest;
  const response = await exportProductsToEcommerce(body.productIds);
  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
