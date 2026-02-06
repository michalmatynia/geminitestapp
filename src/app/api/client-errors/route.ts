import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ErrorSystem } from "@/features/observability/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

export const runtime = "nodejs";

const payloadSchema = z.object({
  message: z.string().min(1),
  name: z.string().optional(),
  stack: z.string().nullable().optional(),
  digest: z.string().optional(),
  url: z.string().optional(),
  userAgent: z.string().optional(),
  componentStack: z.string().nullable().optional(),
  context: z.record(z.string(), z["unknown"]()).nullable().optional(),
  timestamp: z.string().optional(),
});

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const rawBody = await req.text();
  if (!rawBody) {
    return NextResponse.json({ ok: true });
  }
  const trimmed = rawBody.trim();
  let candidate: unknown = trimmed;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      candidate = JSON.parse(trimmed) as unknown;
    } catch {
      candidate = { message: trimmed };
    }
  } else {
    candidate = { message: trimmed };
  }

  const parsed = payloadSchema.safeParse(candidate);
  const data = parsed.success
    ? parsed.data
    : {
        message:
          typeof candidate === "string"
            ? candidate
            : String((candidate as { message?: string })?.message ?? "Unknown client error"),
      };
  
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
    extra: parsed.success ? data.context ?? null : null,
  });

  return NextResponse.json({ ok: true });
}

const disableClientErrorsRateLimit = process.env.NODE_ENV !== "production";

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  {
    source: "client-errors.POST",
    requireCsrf: false,
    rateLimitKey: disableClientErrorsRateLimit ? false : "api",
  }
);
