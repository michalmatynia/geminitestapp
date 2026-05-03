import { type NextRequest, NextResponse } from 'next/server';

import { getExportWarehouseId, setExportWarehouseId } from '@/features/integrations/server';
import { baseExportWarehousePreferencePayloadSchema, baseExportWarehousePreferenceQuerySchema } from '@/shared/contracts/integrations/preferences';
import { type BaseExportWarehousePreferenceResponse } from '@/shared/contracts/integrations';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export { baseExportWarehousePreferencePayloadSchema as requestSchema };
export { baseExportWarehousePreferenceQuerySchema as querySchema };

export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = baseExportWarehousePreferenceQuerySchema.parse(_ctx.query ?? {});
  const inventoryId = query.inventoryId ?? null;
  const warehouseId = await getExportWarehouseId(inventoryId);
  const response: BaseExportWarehousePreferenceResponse = { warehouseId };
  return NextResponse.json(response);
}

export async function postHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(_req, baseExportWarehousePreferencePayloadSchema, {
    logPrefix: 'exports.base.export-warehouse.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  await setExportWarehouseId(data.warehouseId ?? null, data.inventoryId);
  const response: BaseExportWarehousePreferenceResponse = {
    warehouseId: data.warehouseId ?? null,
  };
  return NextResponse.json(response);
}
