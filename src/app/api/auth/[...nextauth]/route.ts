import { handlers } from "@/features/auth/auth";
import { NextRequest } from "next/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";

export const runtime = "nodejs";

async function GET_handler(req: NextRequest) {
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

async function POST_handler(req: NextRequest) {
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

export const GET = apiHandler(GET_handler, { source: "auth.[...nextauth].GET" });
export const POST = apiHandler(POST_handler, { source: "auth.[...nextauth].POST" });
