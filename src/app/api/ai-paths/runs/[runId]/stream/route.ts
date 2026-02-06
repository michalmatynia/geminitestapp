export const runtime = "nodejs";

import { NextRequest } from "next/server";

import { getPathRunRepository } from "@/features/ai/ai-paths/services/path-run-repository";
import { notFoundError } from "@/shared/errors/app-error";
import { assertAiPathRunAccess, requireAiPathsAccess } from "@/features/ai/ai-paths/server";
import type { AiPathRunEventRecord, AiPathRunRecord, AiPathRunNodeRecord } from "@/shared/types/ai-paths";

import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const TERMINAL_STATUSES = new Set([
  "completed",
  "failed",
  "canceled",
  "dead_lettered",
]);
const normalizeLimit = (value: number, fallback: number): number => {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
};
const EVENT_BATCH_LIMIT = normalizeLimit(
  Number(process.env.AI_PATHS_STREAM_EVENT_LIMIT ?? "200"),
  200
);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const toISOStringSafe = (value?: Date | string | null): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
};

const parseSinceParam = (value: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    const asDate = new Date(numeric);
    if (!Number.isNaN(asDate.getTime())) return asDate;
  }
  return null;
};

async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const { runId } = params;
  const access = await requireAiPathsAccess();
  const repo = getPathRunRepository();
  const initialRun = await repo.findRunById(runId);
  if (!initialRun) {
    throw notFoundError("Run not found", { runId });
  }
  assertAiPathRunAccess(access, initialRun);

  const encoder = new TextEncoder();
  const sinceParam = new URL(req.url).searchParams.get("since");
  const initialSince = parseSinceParam(sinceParam);

  let cancelled = false;
  req.signal.addEventListener("abort", () => {
    cancelled = true;
  });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown): void => {
        const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      const run = initialRun;

      send("ready", { runId });
      send("run", run);

      let lastRunUpdatedAt = toISOStringSafe(run.updatedAt ?? run.createdAt);
      let lastNodeUpdatedAt: string | null = null;
      let lastEventCreatedAt = initialSince
        ? initialSince.toISOString()
        : null;

      while (!cancelled) {
        const nextRun: AiPathRunRecord | null = await repo.findRunById(runId);
        if (!nextRun) {
          send("error", { message: "Run not found", runId });
          break;
        }

        const nextRunUpdatedAt = toISOStringSafe(
          nextRun.updatedAt ?? nextRun.createdAt
        );
        if (nextRunUpdatedAt && nextRunUpdatedAt !== lastRunUpdatedAt) {
          send("run", nextRun);
          lastRunUpdatedAt = nextRunUpdatedAt;
        }

        const nodes = await repo.listRunNodes(runId);
        const maxNodeUpdatedAt = nodes.reduce<string | null>((max: string | null, node: AiPathRunNodeRecord) => {
          const candidate = toISOStringSafe(node.updatedAt ?? node.createdAt);
          if (!candidate) return max;
          if (!max) return candidate;
          return candidate > max ? candidate : max;
        }, null);
        if (maxNodeUpdatedAt && maxNodeUpdatedAt !== lastNodeUpdatedAt) {
          send("nodes", nodes);
          lastNodeUpdatedAt = maxNodeUpdatedAt;
        }

        const events = await repo.listRunEvents(runId, {
          ...(lastEventCreatedAt ? { since: lastEventCreatedAt } : {}),
          limit: EVENT_BATCH_LIMIT + 1,
        });
        if (events.length > 0) {
          const overflow = events.length > EVENT_BATCH_LIMIT;
          const batch = overflow ? events.slice(0, EVENT_BATCH_LIMIT) : events;
          send("events", { events: batch, overflow, limit: EVENT_BATCH_LIMIT });
          const latestEventTime = batch.reduce<string | null>((max: string | null, event: AiPathRunEventRecord) => {
            const candidate = toISOStringSafe(event.createdAt);
            if (!candidate) return max;
            if (!max) return candidate;
            return candidate > max ? candidate : max;
          }, lastEventCreatedAt);
          if (latestEventTime) {
            lastEventCreatedAt = latestEventTime;
          }
        }

        if (TERMINAL_STATUSES.has(nextRun.status)) {
          send("done", { runId, status: nextRun.status });
          break;
        }

        await sleep(1000);
      }

      controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export const GET = apiHandlerWithParams<{ runId: string }>(GET_handler, {
  source: "ai-paths.runs.stream",
});
