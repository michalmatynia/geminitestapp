import { handlers } from "@/features/auth/server";
import { NextRequest } from "next/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { logAuthEvent } from "@/features/auth/utils/auth-request-logger";

export const runtime = "nodejs";

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await logAuthEvent({ req, action: "auth.nextauth", stage: "start" });
  try {
    const response = await handlers.GET(req);
    await logAuthEvent({ req, action: "auth.nextauth", stage: "success", status: response.status });
    return response;
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "auth.[...nextauth].GET",
      fallbackMessage: "Failed to process auth request",
    });
  }
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await logAuthEvent({ req, action: "auth.nextauth", stage: "start" });
  try {
    const response = await handlers.POST(req);
    await logAuthEvent({ req, action: "auth.nextauth", stage: "success", status: response.status });
    return response;
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
 { source: "auth.[...nextauth].GET", requireCsrf: false });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "auth.[...nextauth].POST", requireCsrf: false });
