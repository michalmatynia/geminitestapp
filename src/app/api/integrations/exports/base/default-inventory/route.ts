export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getExportDefaultInventoryId,
  setExportDefaultInventoryId
} from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const requestSchema = z.object({
  inventoryId: z.string().trim().min(1).nullable().optional()
});

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const inventoryId = await getExportDefaultInventoryId();
    return NextResponse.json({ inventoryId });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.exports.base.default-inventory.GET",
      fallbackMessage: "Failed to fetch inventory."
    });
  }
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const parsed = await parseJsonBody(req, requestSchema, {
      logPrefix: "exports.base.default-inventory.POST"
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
      fallbackMessage: "Failed to save inventory"
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "products.exports.base.default-inventory.GET", requireCsrf: false });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "products.exports.base.default-inventory.POST", requireCsrf: false });
