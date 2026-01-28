import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/features/products";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { ErrorSystem } from "@/features/observability";
import { apiHandler } from "@/shared/lib/api/api-handler";

export const runtime = "nodejs";

const payloadSchema = z.object({
  message: z.string().min(1),
  name: z.string().optional(),
  stack: z.string().nullable().optional(),
  digest: z.string().optional(),
  url: z.string().optional(),
  userAgent: z.string().optional(),
  componentStack: z.string().nullable().optional(),
  context: z.record(z.string(), z.unknown()).nullable().optional(),
  timestamp: z.string().optional(),
});

async function POST_handler(req: Request) {
  try {
    const parsed = await parseJsonBody(req, payloadSchema, {
      logPrefix: "client-errors.POST",
    });
    if (!parsed.ok) return parsed.response;

    const data = parsed.data;
    
    // Log as a client error using the centralized ErrorSystem
    await ErrorSystem.captureException(new Error(data.message), {
      service: "client-error-reporter",
      name: data.name,
      stack: data.stack || undefined,
      digest: data.digest,
      url: data.url,
      userAgent: data.userAgent,
      componentStack: data.componentStack,
      clientTimestamp: data.timestamp,
      extra: data.context ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: "api/client-errors",
      method: "POST",
    });
    return createErrorResponse(error, {
      request: req,
      source: "client-errors.POST",
      fallbackMessage: "Failed to log client error",
    });
  }
}

export const POST = apiHandler(POST_handler, { source: "client-errors.POST" });
