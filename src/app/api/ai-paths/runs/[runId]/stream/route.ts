export const runtime = 'nodejs';

import { NextRequest } from 'next/server';

import { assertAiPathRunAccess, requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { getRedisSubscriber, isSubscriberConnected } from '@/shared/lib/redis-pubsub';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import type { AiPathRunRecord, AiPathRunNodeRecord } from '@/shared/types/domain/ai-paths';

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
const PUBSUB_IDLE_TIMEOUT_MS = 30_000;
const PUBSUB_CATCHUP_INTERVAL_MS = 10_000;
const POLL_INTERVAL_MS = 500;

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

type PubSubMessage = {
  type: string;
  data: unknown;
  ts?: number;
};

/**
 * Catch-up query: fetches current DB state and sends any changes since cursors.
 * Returns whether the run is in a terminal state.
 */
async function sendCatchUp(
  runId: string,
  send: (event: string, data: unknown) => void,
  cursors: {
    lastRunUpdatedAt: string | null;
    lastNodeCursor: { ts: string; nodeId: string } | null;
    lastEventCursor: { createdAt: string; id: string } | null;
  }
): Promise<{
  terminal: boolean;
  lastRunUpdatedAt: string | null;
  lastNodeCursor: { ts: string; nodeId: string } | null;
  lastEventCursor: { createdAt: string; id: string } | null;
}> {
  const repo = await getPathRunRepository();
  const nextRun: AiPathRunRecord | null = await repo.findRunById(runId);
  let { lastRunUpdatedAt, lastNodeCursor, lastEventCursor } = cursors;

  if (!nextRun) {
    send('error', { message: 'Run not found', runId });
    return { terminal: true, lastRunUpdatedAt, lastNodeCursor, lastEventCursor };
  }

  const nextRunUpdatedAt = toISOStringSafe(nextRun.updatedAt ?? nextRun.createdAt);
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
    const latestNodeTs = toISOStringSafe(latestNode?.updatedAt ?? latestNode?.createdAt);
    if (latestNodeTs && latestNode) {
      lastNodeCursor = { ts: latestNodeTs, nodeId: latestNode.nodeId };
    }
  }

  const events = await repo.listRunEvents(runId, {
    ...(lastEventCursor ? { after: lastEventCursor } : {}),
    limit: EVENT_BATCH_LIMIT + 1,
  });
  if (events.length > 0) {
    const overflow = events.length > EVENT_BATCH_LIMIT;
    const batch = overflow ? events.slice(0, EVENT_BATCH_LIMIT) : events;
    send('events', { events: batch, overflow, limit: EVENT_BATCH_LIMIT });
    const latestEvent = batch[batch.length - 1];
    const latestEventCreatedAt = toISOStringSafe(latestEvent?.createdAt);
    if (latestEventCreatedAt && latestEvent?.id) {
      lastEventCursor = { createdAt: latestEventCreatedAt, id: latestEvent.id };
    }
  }

  const terminal = TERMINAL_STATUSES.has(nextRun.status);
  if (terminal) {
    send('done', { runId, status: nextRun.status });
  }

  return { terminal, lastRunUpdatedAt, lastNodeCursor, lastEventCursor };
}

/**
 * Redis pub/sub streaming: subscribe to channel, forward messages as SSE events.
 * Falls back to polling if Redis is unavailable or disconnects mid-stream.
 */
async function streamWithPubSub(
  runId: string,
  controller: ReadableStreamDefaultController,
  send: (event: string, data: unknown) => void,
  initialCursors: {
    lastRunUpdatedAt: string | null;
    lastNodeCursor: { ts: string; nodeId: string } | null;
    lastEventCursor: { createdAt: string; id: string } | null;
  },
  isCancelled: () => boolean
): Promise<void> {
  const sub = getRedisSubscriber();
  if (!sub || !isSubscriberConnected()) {
    await streamWithPolling(runId, controller, send, initialCursors, isCancelled);
    return;
  }

  const channel = `ai-paths:run:${runId}`;
  let done = false;
  let subscriberDisconnected = false;
  let lastActivityMs = Date.now();
  let lastCatchUpMs = Date.now();
  let cursors = { ...initialCursors };

  const messageHandler = (_ch: string, rawMessage: string): void => {
    if (done || isCancelled()) return;
    lastActivityMs = Date.now();
    try {
      const msg = JSON.parse(rawMessage) as PubSubMessage;
      send(msg.type, msg.data);
      if (msg.type === 'done' || msg.type === 'error') {
        done = true;
      }
    } catch {
      // Malformed message — ignore
    }
  };

  const disconnectHandler = (): void => {
    subscriberDisconnected = true;
  };

  try {
    // Listen for subscriber disconnection
    sub.on('end', disconnectHandler);
    sub.on('close', disconnectHandler);

    // 1. Subscribe first (buffering begins)
    sub.on('message', messageHandler);
    await sub.subscribe(channel);

    // 2. Catch-up query to handle race condition
    const catchUp = await sendCatchUp(runId, send, cursors);
    cursors = {
      lastRunUpdatedAt: catchUp.lastRunUpdatedAt,
      lastNodeCursor: catchUp.lastNodeCursor,
      lastEventCursor: catchUp.lastEventCursor,
    };
    if (catchUp.terminal) {
      done = true;
    }
    lastCatchUpMs = Date.now();

    // 3. Wait for messages until done, cancelled, disconnected, or idle timeout
    while (!done && !isCancelled()) {
      await sleep(1000);

      // Detect subscriber disconnection → fall back to polling
      if (subscriberDisconnected || !isSubscriberConnected()) {
        try {
          sub.off('message', messageHandler);
          await sub.unsubscribe(channel);
        } catch {
          // Already disconnected
        }
        await streamWithPolling(runId, controller, send, cursors, isCancelled);
        return;
      }

      const now = Date.now();

      // Periodic catch-up query every 10s to catch lost messages
      if (now - lastCatchUpMs >= PUBSUB_CATCHUP_INTERVAL_MS) {
        const check = await sendCatchUp(runId, send, cursors);
        cursors = {
          lastRunUpdatedAt: check.lastRunUpdatedAt,
          lastNodeCursor: check.lastNodeCursor,
          lastEventCursor: check.lastEventCursor,
        };
        lastCatchUpMs = now;
        if (check.terminal) {
          done = true;
          break;
        }
      }

      // Idle timeout — final safety net
      if (now - lastActivityMs > PUBSUB_IDLE_TIMEOUT_MS) {
        const check = await sendCatchUp(runId, send, cursors);
        cursors = {
          lastRunUpdatedAt: check.lastRunUpdatedAt,
          lastNodeCursor: check.lastNodeCursor,
          lastEventCursor: check.lastEventCursor,
        };
        if (check.terminal) {
          done = true;
          break;
        }
        lastActivityMs = now;
      }
    }
  } finally {
    try {
      sub.off('message', messageHandler);
      sub.off('end', disconnectHandler);
      sub.off('close', disconnectHandler);
      await sub.unsubscribe(channel);
    } catch {
      // Subscriber may already be disconnected
    }
  }
}

/**
 * Polling fallback: original 500ms DB polling mechanism.
 */
async function streamWithPolling(
  runId: string,
  _controller: ReadableStreamDefaultController,
  send: (event: string, data: unknown) => void,
  initialCursors: {
    lastRunUpdatedAt: string | null;
    lastNodeCursor: { ts: string; nodeId: string } | null;
    lastEventCursor: { createdAt: string; id: string } | null;
  },
  isCancelled: () => boolean
): Promise<void> {
  let cursors = { ...initialCursors };

  while (!isCancelled()) {
    const result = await sendCatchUp(runId, send, cursors);
    cursors = {
      lastRunUpdatedAt: result.lastRunUpdatedAt,
      lastNodeCursor: result.lastNodeCursor,
      lastEventCursor: result.lastEventCursor,
    };
    if (result.terminal) break;
    await sleep(POLL_INTERVAL_MS);
  }
}

async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const { runId } = params;
  const access = await requireAiPathsAccess();
  const repo = await getPathRunRepository();
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
        if (cancelled) return;
        const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      send('ready', { runId });
      send('run', initialRun);

      const initialCursors = {
        lastRunUpdatedAt: toISOStringSafe(initialRun.updatedAt ?? initialRun.createdAt),
        lastNodeCursor: null as { ts: string; nodeId: string } | null,
        lastEventCursor: initialSince
          ? { createdAt: initialSince.toISOString(), id: '' }
          : null as { createdAt: string; id: string } | null,
      };

      // If already terminal, send done immediately
      if (TERMINAL_STATUSES.has(initialRun.status)) {
        send('done', { runId, status: initialRun.status });
        controller.close();
        return;
      }

      await streamWithPubSub(
        runId,
        controller,
        send,
        initialCursors,
        () => cancelled
      );

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
