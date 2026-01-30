import { NextRequest } from "next/server";

import { getPathRunRepository } from "@/features/ai-paths/services/path-run-repository";

const TERMINAL_STATUSES = new Set([
  "completed",
  "failed",
  "canceled",
  "dead_lettered",
]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toISOStringSafe = (value?: Date | string | null) => {
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

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ runId: string }> }
): Promise<Response> {
  const { runId } = await ctx.params;
  const repo = await getPathRunRepository();
  const encoder = new TextEncoder();
  const sinceParam = new URL(req.url).searchParams.get("since");
  const initialSince = parseSinceParam(sinceParam);

  let cancelled = false;
  req.signal.addEventListener("abort", () => {
    cancelled = true;
  });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      const run = await repo.findRunById(runId);
      if (!run) {
        send("error", { message: "Run not found", runId });
        controller.close();
        return;
      }

      send("ready", { runId });
      send("run", run);

      let lastRunUpdatedAt = toISOStringSafe(run.updatedAt ?? run.createdAt);
      let lastNodeUpdatedAt: string | null = null;
      let lastEventCreatedAt = initialSince
        ? initialSince.toISOString()
        : null;

      while (!cancelled) {
        const nextRun = await repo.findRunById(runId);
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
        const maxNodeUpdatedAt = nodes.reduce<string | null>((max, node) => {
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
        });
        if (events.length > 0) {
          send("events", events);
          const latestEventTime = events.reduce<string | null>((max, event) => {
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
