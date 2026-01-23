import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getExportDefaultInventoryId,
  setExportDefaultInventoryId,
} from "@/lib/services/export-template-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/lib/api/parse-json";

const requestSchema = z.object({
  inventoryId: z.string().trim().min(1).nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const inventoryId = await getExportDefaultInventoryId();
    return NextResponse.json({ inventoryId });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "exports.base.default-inventory.GET",
      fallbackMessage: "Failed to fetch inventory.",
    });
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await parseJsonBody(req, requestSchema, {
      logPrefix: "exports.base.default-inventory.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
    await setExportDefaultInventoryId(data.inventoryId ?? null);
    return NextResponse.json({ inventoryId: data.inventoryId ?? null });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "exports.base.default-inventory.POST",
      fallbackMessage: "Failed to save inventory",
    });
  }
}
