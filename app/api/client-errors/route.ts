import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/parse-json";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { logSystemEvent } from "@/lib/services/system-logger";

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

export async function POST(req: Request) {
  try {
    const parsed = await parseJsonBody(req, payloadSchema, {
      logPrefix: "client-errors.POST",
    });
    if (!parsed.ok) return parsed.response;

    const data = parsed.data;
    await logSystemEvent({
      level: "error",
      message: data.message,
      source: "client",
      request: req,
      context: {
        name: data.name,
        digest: data.digest,
        url: data.url,
        userAgent: data.userAgent,
        componentStack: data.componentStack,
        timestamp: data.timestamp,
        extra: data.context ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "client-errors.POST",
      fallbackMessage: "Failed to log client error",
    });
  }
}
