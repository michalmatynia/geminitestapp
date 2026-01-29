import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getExportWarehouseId,
  setExportWarehouseId,
} from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const requestSchema = z.object({
  warehouseId: z.string().trim().min(1).nullable().optional(),
  inventoryId: z.string().trim().min(1).nullable().optional(),
});

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const url = new URL(req.url);
    const inventoryId = url.searchParams.get("inventoryId")?.trim() || null;
    const warehouseId = await getExportWarehouseId(inventoryId);
    return NextResponse.json({ warehouseId });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.imports.base.export-warehouse.GET",
      fallbackMessage: "Failed to fetch warehouse.",
    });
  }
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const parsed = await parseJsonBody(req, requestSchema, {
      logPrefix: "imports.base.export-warehouse.POST",
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
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "products.imports.base.export-warehouse.POST",
      fallbackMessage: "Failed to save warehouse",
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "products.imports.base.export-warehouse.GET" });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "products.imports.base.export-warehouse.POST" });
