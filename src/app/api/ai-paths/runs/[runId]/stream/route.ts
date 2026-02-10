export const runtime = 'nodejs';

import { NextRequest } from 'next/server';

import { assertAiPathRunAccess, requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { AiPathRunRecord, AiPathRunNodeRecord } from '@/shared/types/ai-paths';
import type { ApiHandlerContext } from '@/shared/types/api';

const TERMINAL_STATUSES = new Set([
  'completed',
  'failed',
  'canceled',
  'dead_lettered',
]);
const normalizeLimit = (value: number, fallback: number): number => {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
};
const EVENT_BATCH_LIMIT = normalizeLimit(
  Number(process.env['AI_PATHS_STREAM_EVENT_LIMIT'] ?? '200'),
  200
);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const toISOStringSafe = (value?: Date | string | null): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.toISOString();
};

const isAfterCursor = (
  candidateTs: string,
  candidateId: string,
  cursorTs: string,
  cursorId: string
): boolean => {
  if (candidateTs > cursorTs) return true;
  if (candidateTs < cursorTs) return false;
  return candidateId > cursorId;
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
    throw notFoundError('Run not found', { runId });
  }
  assertAiPathRunAccess(access, initialRun);

  const encoder = new TextEncoder();
  const sinceParam = new URL(req.url).searchParams.get('since');
  const initialSince = parseSinceParam(sinceParam);

  let cancelled = false;
  req.signal.addEventListener('abort', () => {
    cancelled = true;
  });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown): void => {
        const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      const run = initialRun;

      send('ready', { runId });
      send('run', run);

      let lastRunUpdatedAt = toISOStringSafe(run.updatedAt ?? run.createdAt);
      let lastNodeCursor: { ts: string; nodeId: string } | null = null;
      let lastEventCursor: { createdAt: string; id: string } | null = initialSince
        ? { createdAt: initialSince.toISOString(), id: '' }
        : null;

      while (!cancelled) {
        const nextRun: AiPathRunRecord | null = await repo.findRunById(runId);
        if (!nextRun) {
          send('error', { message: 'Run not found', runId });
          break;
        }

        const nextRunUpdatedAt = toISOStringSafe(
          nextRun.updatedAt ?? nextRun.createdAt
        );
        if (nextRunUpdatedAt && nextRunUpdatedAt !== lastRunUpdatedAt) {
          send('run', nextRun);
          lastRunUpdatedAt = nextRunUpdatedAt;
        }

        const nodes = await repo.listRunNodes(runId);
        const changedNodes = nodes
          .filter((node: AiPathRunNodeRecord) => {
            const ts = toISOStringSafe(node.updatedAt ?? node.createdAt);
            if (!ts) return false;
            if (!lastNodeCursor) return true;
            return isAfterCursor(ts, node.nodeId, lastNodeCursor.ts, lastNodeCursor.nodeId);
          })
          .sort((a: AiPathRunNodeRecord, b: AiPathRunNodeRecord) => {
            const aTs = toISOStringSafe(a.updatedAt ?? a.createdAt) ?? '';
            const bTs = toISOStringSafe(b.updatedAt ?? b.createdAt) ?? '';
            if (aTs === bTs) return a.nodeId.localeCompare(b.nodeId);
            return aTs.localeCompare(bTs);
          });
        if (changedNodes.length > 0) {
          send('nodes', changedNodes);
          const latestNode = changedNodes[changedNodes.length - 1];
          const latestNodeTs = toISOStringSafe(
            latestNode?.updatedAt ?? latestNode?.createdAt
          );
          if (latestNodeTs && latestNode) {
            lastNodeCursor = { ts: latestNodeTs, nodeId: latestNode.nodeId };
          }
        }

        const events = await repo.listRunEvents(runId, {
          ...(lastEventCursor
            ? { after: lastEventCursor }
            : {}),
          limit: EVENT_BATCH_LIMIT + 1,
        });
        if (events.length > 0) {
          const overflow = events.length > EVENT_BATCH_LIMIT;
          const batch = overflow ? events.slice(0, EVENT_BATCH_LIMIT) : events;
          send('events', { events: batch, overflow, limit: EVENT_BATCH_LIMIT });
          const latestEvent = batch[batch.length - 1];
          const latestEventCreatedAt = toISOStringSafe(latestEvent?.createdAt);
          if (latestEventCreatedAt && latestEvent?.id) {
            lastEventCursor = {
              createdAt: latestEventCreatedAt,
              id: latestEvent.id,
            };
          }
        }

        if (TERMINAL_STATUSES.has(nextRun.status)) {
          send('done', { runId, status: nextRun.status });
          break;
        }

        await sleep(500);
      }

      controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

export const GET = apiHandlerWithParams<{ runId: string }>(GET_handler, {
  source: 'ai-paths.runs.stream',
});
