import { NextRequest } from 'next/server';
import { z } from 'zod';

import { assertAiPathRunAccess, requireAiPathsRunAccess } from '@/features/ai/ai-paths/server';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';
import type { AiPathRunRepository } from '@/shared/contracts/ai-paths';
import {
  resolvePathRunRepository,
} from '@/shared/lib/ai-paths/services/path-run-repository';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { getRedisSubscriber, isSubscriberConnected } from '@/shared/lib/redis-pubsub';
import { safeSetInterval } from '@/shared/lib/timers';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const TERMINAL_STATUSES = new Set(['completed', 'failed', 'canceled', 'dead_lettered']);
const normalizeLimit = (value: number, fallback: number): number => {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
};
const EVENT_BATCH_LIMIT = normalizeLimit(
  Number(process.env['AI_PATHS_STREAM_EVENT_LIMIT'] ?? '200'),
  200
);
const NODE_BATCH_LIMIT = normalizeLimit(
  Number(process.env['AI_PATHS_STREAM_NODE_LIMIT'] ?? '200'),
  200
);
const PUBSUB_IDLE_TIMEOUT_MS = 30_000;
const PUBSUB_CATCHUP_INTERVAL_MS = 10_000;
const POLL_INTERVAL_MIN_MS = 200;
const POLL_INTERVAL_MAX_MS = 2_000;
const POLL_BACKOFF_MULTIPLIER = 1.5;
const STREAM_KEEPALIVE_INTERVAL_MS = 15_000;

export const querySchema = z.object({
  since: optionalTrimmedQueryString(),
});

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const toISOStringSafe = (value?: Date | string | null): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
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
  repo: AiPathRunRepository,
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
  const nextRun: AiPathRunRecord | null = await repo.findRunById(runId);
  let { lastRunUpdatedAt, lastNodeCursor, lastEventCursor } = cursors;

  if (!nextRun) {
    send('error', { message: 'Run not found', runId });
    return {
      terminal: true,
      lastRunUpdatedAt,
      lastNodeCursor,
      lastEventCursor,
    };
  }

  const nextRunUpdatedAt = toISOStringSafe(nextRun.updatedAt ?? nextRun.createdAt);
  if (nextRunUpdatedAt && nextRunUpdatedAt !== lastRunUpdatedAt) {
    send('run', nextRun);
    lastRunUpdatedAt = nextRunUpdatedAt;
  }

  const changedNodes = lastNodeCursor
    ? await repo.listRunNodesSince(
      runId,
      { updatedAt: lastNodeCursor.ts, nodeId: lastNodeCursor.nodeId },
      { limit: NODE_BATCH_LIMIT }
    )
    : await repo.listRunNodes(runId);
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
  repo: AiPathRunRepository,
  runId: string,
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
    await streamWithPolling(repo, runId, send, initialCursors, isCancelled);
    return;
  }

  const channel = `ai-paths:run:${runId}`;
  let done = false;
  let subscriberDisconnected = false;
  let lastActivityMs = Date.now();
  let lastCatchUpMs: number;
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
    } catch (error) {
      void ErrorSystem.captureException(error);
    
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
    const catchUp = await sendCatchUp(repo, runId, send, cursors);
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
        } catch (error) {
          void ErrorSystem.captureException(error);
        
          // Already disconnected
        }
        await streamWithPolling(repo, runId, send, cursors, isCancelled);
        return;
      }

      const now = Date.now();

      // Periodic catch-up query every 10s to catch lost messages
      if (now - lastCatchUpMs >= PUBSUB_CATCHUP_INTERVAL_MS) {
        const check = await sendCatchUp(repo, runId, send, cursors);
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
        const check = await sendCatchUp(repo, runId, send, cursors);
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
    } catch (error) {
      void ErrorSystem.captureException(error);
    
      // Subscriber may already be disconnected
    }
  }
}

/**
 * Polling fallback: adaptive DB polling — backs off when idle, resets on activity.
 * Interval range: POLL_INTERVAL_MIN_MS → POLL_INTERVAL_MAX_MS.
 */
async function streamWithPolling(
  repo: AiPathRunRepository,
  runId: string,
  send: (event: string, data: unknown) => void,
  initialCursors: {
    lastRunUpdatedAt: string | null;
    lastNodeCursor: { ts: string; nodeId: string } | null;
    lastEventCursor: { createdAt: string; id: string } | null;
  },
  isCancelled: () => boolean
): Promise<void> {
  let cursors = { ...initialCursors };
  let pollIntervalMs = POLL_INTERVAL_MIN_MS;

  while (!isCancelled()) {
    const prevNodeTs = cursors.lastNodeCursor?.ts;
    const prevEventId = cursors.lastEventCursor?.id;
    const prevRunUpdatedAt = cursors.lastRunUpdatedAt;

    const result = await sendCatchUp(repo, runId, send, cursors);
    cursors = {
      lastRunUpdatedAt: result.lastRunUpdatedAt,
      lastNodeCursor: result.lastNodeCursor,
      lastEventCursor: result.lastEventCursor,
    };
    if (result.terminal) break;

    // Back off when no changes detected; reset to minimum on any activity.
    const hadActivity =
      cursors.lastRunUpdatedAt !== prevRunUpdatedAt ||
      cursors.lastNodeCursor?.ts !== prevNodeTs ||
      cursors.lastEventCursor?.id !== prevEventId;
    pollIntervalMs = hadActivity
      ? POLL_INTERVAL_MIN_MS
      : Math.min(pollIntervalMs * POLL_BACKOFF_MULTIPLIER, POLL_INTERVAL_MAX_MS);

    await sleep(pollIntervalMs);
  }
}

export async function getAiPathRunStreamHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const { runId } = params;
  const access = await requireAiPathsRunAccess();
  const repoSelection = await resolvePathRunRepository();
  let readRepo = repoSelection.repo;
  let readProvider = repoSelection.provider;
  const readMode = 'selected' as const;
  let initialRun = await readRepo.findRunById(runId);
  if (!initialRun) {
    throw notFoundError('Run not found', { runId });
  }
  assertAiPathRunAccess(access, initialRun);

  const encoder = new TextEncoder();
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const initialSince = parseSinceParam(query.since ?? null);

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
      const sendComment = (comment: string): void => {
        if (cancelled) return;
        controller.enqueue(encoder.encode(`: ${comment}\n\n`));
      };
      const keepAliveTimer = safeSetInterval(() => {
        sendComment('keepalive');
      }, STREAM_KEEPALIVE_INTERVAL_MS);

      try {
        send('ready', {
          runId,
          repository: {
            selectedProvider: repoSelection.provider,
            selectedRouteMode: repoSelection.routeMode,
            readProvider,
            readMode,
          },
        });
        send('run', initialRun);

        const initialCursors = {
          lastRunUpdatedAt: toISOStringSafe(initialRun.updatedAt ?? initialRun.createdAt),
          lastNodeCursor: null as { ts: string; nodeId: string } | null,
          lastEventCursor: initialSince
            ? { createdAt: initialSince.toISOString(), id: '' }
            : (null as { createdAt: string; id: string } | null),
        };

        // If already terminal, send done immediately
        if (TERMINAL_STATUSES.has(initialRun.status)) {
          send('done', { runId, status: initialRun.status });
          controller.close();
          return;
        }

        await streamWithPubSub(readRepo, runId, send, initialCursors, () => cancelled);

        controller.close();
      } finally {
        clearInterval(keepAliveTimer);
      }
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
      'X-Ai-Paths-Run-Provider': repoSelection.provider,
      'X-Ai-Paths-Run-Route-Mode': repoSelection.routeMode,
      'X-Ai-Paths-Run-Read-Provider': readProvider,
      'X-Ai-Paths-Run-Read-Mode': readMode,
    },
  });
}
