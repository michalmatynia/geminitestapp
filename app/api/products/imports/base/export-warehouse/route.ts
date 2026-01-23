import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getExportWarehouseId,
  setExportWarehouseId,
} from "@/lib/services/import-template-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/lib/api/parse-json";

const requestSchema = z.object({
  warehouseId: z.string().trim().min(1).nullable().optional(),
  inventoryId: z.string().trim().min(1).nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const inventoryId = url.searchParams.get("inventoryId")?.trim() || null;
    const warehouseId = await getExportWarehouseId(inventoryId);
    return NextResponse.json({ warehouseId });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "imports.base.export-warehouse.GET",
      fallbackMessage: "Failed to fetch warehouse.",
    });
  }
}

export async function POST(req: Request) {
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
      source: "imports.base.export-warehouse.POST",
      fallbackMessage: "Failed to save warehouse",
    });
  }
}
