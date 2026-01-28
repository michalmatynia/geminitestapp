import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getExportDefaultInventoryId,
  setExportDefaultInventoryId,
} from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { apiHandler } from "@/shared/lib/api/api-handler";

const requestSchema = z.object({
  inventoryId: z.string().trim().min(1).nullable().optional(),
});

async function GET_handler(req: Request) {
  try {
    const inventoryId = await getExportDefaultInventoryId();
    return NextResponse.json({ inventoryId });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.exports.base.default-inventory.GET",
      fallbackMessage: "Failed to fetch inventory.",
    });
  }
}

async function POST_handler(req: Request) {
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
      source: "products.exports.base.default-inventory.POST",
      fallbackMessage: "Failed to save inventory",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "products.exports.base.default-inventory.GET" });
export const POST = apiHandler(POST_handler, { source: "products.exports.base.default-inventory.POST" });
