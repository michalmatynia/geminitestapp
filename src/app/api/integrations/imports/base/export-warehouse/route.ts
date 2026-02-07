export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getExportWarehouseId,
  setExportWarehouseId
} from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const requestSchema = z.object({
  warehouseId: z.string().trim().min(1).nullable().optional(),
  inventoryId: z.string().trim().min(1).nullable().optional()
});

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const url = new URL(req.url);
  const inventoryId = url.searchParams.get("inventoryId")?.trim() || null;
  const warehouseId = await getExportWarehouseId(inventoryId);
  return NextResponse.json({ warehouseId });
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, requestSchema, {
    logPrefix: "imports.base.export-warehouse.POST"
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

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "products.imports.base.export-warehouse.GET", requireCsrf: false });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "products.imports.base.export-warehouse.POST", requireCsrf: false });
