import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ErrorSystem } from "@/features/observability/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

export const runtime = "nodejs";
const CLIENT_ERROR_DEDUP_WINDOW_MS = Number(
  process.env.CLIENT_ERROR_DEDUP_WINDOW_MS ?? "30000"
);
const CLIENT_ERROR_DEDUP_RETENTION_MS = Math.max(
  60_000,
  CLIENT_ERROR_DEDUP_WINDOW_MS * 20
);

type ClientErrorDedupEntry = {
  firstSeenAt: number;
  lastSeenAt: number;
  lastLoggedAt: number;
  count: number;
};

const globalWithClientErrorDedup = globalThis as typeof globalThis & {
  __clientErrorDedupMap__?: Map<string, ClientErrorDedupEntry>;
};

const clientErrorDedupMap =
  globalWithClientErrorDedup.__clientErrorDedupMap__ ??
  (globalWithClientErrorDedup.__clientErrorDedupMap__ = new Map());

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

const buildDedupKey = (data: {
  message: string;
  name?: string | undefined;
  digest?: string | undefined;
  url?: string | undefined;
}): string =>
  [
    data.name ?? "error",
    data.message.trim(),
    data.digest ?? "",
    data.url ?? "",
  ].join("|");

const shouldLogClientError = (key: string, now: number): boolean => {
  for (const [entryKey, entry] of clientErrorDedupMap.entries()) {
    if (now - entry.lastSeenAt > CLIENT_ERROR_DEDUP_RETENTION_MS) {
      clientErrorDedupMap.delete(entryKey);
    }
  }

  const existing = clientErrorDedupMap.get(key);
  if (!existing) {
    clientErrorDedupMap.set(key, {
      firstSeenAt: now,
      lastSeenAt: now,
      lastLoggedAt: now,
      count: 1,
    });
    return true;
  }

  existing.lastSeenAt = now;
  existing.count += 1;
  if (now - existing.lastLoggedAt >= CLIENT_ERROR_DEDUP_WINDOW_MS) {
    existing.lastLoggedAt = now;
    return true;
  }
  return false;
};

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

  const dedupKey = buildDedupKey(data);
  const now = Date.now();
  if (!shouldLogClientError(dedupKey, now)) {
    return NextResponse.json({ ok: true, deduped: true });
  }

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
