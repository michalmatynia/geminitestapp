import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getExportDefaultConnectionId,
  setExportDefaultConnectionId,
} from "@/lib/services/export-template-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/lib/api/parse-json";
import { apiHandler } from "@/lib/api/api-handler";

const postSchema = z.object({
  connectionId: z.string().nullable(),
});

/**
 * GET /api/products/exports/base/default-connection
 * Returns the default Base.com connection ID for exports
 */
async function GET_handler(req: NextRequest) {
  try {
    const connectionId = await getExportDefaultConnectionId();
    return NextResponse.json({ connectionId });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.exports.base.default-connection.GET",
      fallbackMessage: "Failed to get default connection ID",
    });
  }
}

/**
 * POST /api/products/exports/base/default-connection
 * Sets the default Base.com connection ID for exports
 */
async function POST_handler(req: NextRequest) {
  try {
    const parsed = await parseJsonBody(req, postSchema, {
      logPrefix: "exports.base.default-connection.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
    await setExportDefaultConnectionId(data.connectionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.exports.base.default-connection.POST",
      fallbackMessage: "Failed to set default connection ID",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "products.exports.base.default-connection.GET" });
export const POST = apiHandler(POST_handler, { source: "products.exports.base.default-connection.POST" });
