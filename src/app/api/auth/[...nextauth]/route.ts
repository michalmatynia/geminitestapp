import { handlers } from "@/features/auth/server";
import { NextRequest } from "next/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

export const runtime = "nodejs";

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  console.log("[AUTH-API] GET request", req.url);
  try {
    return await handlers.GET(req);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "auth.[...nextauth].GET",
      fallbackMessage: "Failed to process auth request",
    });
  }
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  console.log("[AUTH-API] POST request", req.url);
  try {
    return await handlers.POST(req);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "auth.[...nextauth].POST",
      fallbackMessage: "Failed to process auth request",
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "auth.[...nextauth].GET" });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "auth.[...nextauth].POST" });
