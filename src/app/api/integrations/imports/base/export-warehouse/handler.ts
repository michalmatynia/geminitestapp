import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getExportWarehouseId,
  setExportWarehouseId
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const requestSchema = z.object({
  warehouseId: z.string().trim().min(1).nullable().optional(),
  inventoryId: z.string().trim().min(1).nullable().optional()
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const url = new URL(_req.url);
  const inventoryId = url.searchParams.get('inventoryId')?.trim() || null;
  const warehouseId = await getExportWarehouseId(inventoryId);
  return NextResponse.json({ warehouseId });
}

export async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(_req, requestSchema, {
    logPrefix: 'imports.base.export-warehouse.POST'
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  await setExportWarehouseId(
    data.warehouseId ?? null,
    data.inventoryId ?? null
  );
  return NextResponse.json({ warehouseId: data.warehouseId ?? null });
}
