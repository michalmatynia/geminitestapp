import { type NextRequest } from 'next/server';

import { assertAiPathRunAccess, requireAiPathsRunAccess } from '@/features/ai/ai-paths/server';
import {
  aiPathRunStreamQuerySchema,
  type AiPathRunRecord,
} from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';
import type { AiPathRunRepository } from '@/shared/contracts/ai-paths';
import { resolvePathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { getRedisSubscriber, isSubscriberConnected } from '@/shared/lib/redis-pubsub';
import { safeClearInterval, safeSetInterval, safeSetTimeout } from '@/shared/lib/timers';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'canceled']);
const normalizeLimit = (value: number, fallback: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
};
const EVENT_BATCH_LIMIT = normalizeLimit(Number(process.env['AI_PATHS_STREAM_EVENT_LIMIT'] ?? '200'), 200);
const NODE_BATCH_LIMIT = normalizeLimit(Number(process.env['AI_PATHS_STREAM_NODE_LIMIT'] ?? '200'), 200);
const PUBSUB_IDLE_TIMEOUT_MS = 30_000;
const PUBSUB_CATCHUP_INTERVAL_MS = 10_000;
const POLL_INTERVAL_MIN_MS = 200;
const POLL_INTERVAL_MAX_MS = 2_000;
const POLL_BACKOFF_MULTIPLIER = 1.5;
const STREAM_KEEPALIVE_INTERVAL_MS = 15_000;
const POLL_CYCLE_MS = 1_000;

export const querySchema = aiPathRunStreamQuerySchema;

type StreamEventSender = (event: string, data: unknown) => void;
type RunCursors = {
  readonly lastRunUpdatedAt: string | null;
  readonly lastNodeCursor: { ts: string; nodeId: string } | null;
  readonly lastEventCursor: { createdAt: string; id: string } | null;
};
type RunStreamContext = {
  repo: AiPathRunRepository;
  runId: string;
  send: StreamEventSender;
  isCancelled: () => boolean;
};
type RunStreamState = {
  cursors: RunCursors;
  intervalMs: number;
};

type PubSubMessage = {
  type: string;
  data: unknown;
  ts?: number;
};

const sleep = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => {
    void safeSetTimeout(resolve, ms);
  });

const toISOStringSafe = (value?: Date | string | null): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  return value.toISOString();
};

const parseSinceParam = (value: string | null): Date | null => {
  if (value === null) {
    return null;
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    const asDate = new Date(numeric);
    if (!Number.isNaN(asDate.getTime())) {
      return asDate;
    }
  }
  return null;
};

const sendRunCatchUp = async (
  context: RunStreamContext,
  cursors: RunCursors
): Promise<{ terminal: boolean; cursors: RunCursors }> => {
  const run = await context.repo.findRunById(context.runId);
  if (run === null) {
    context.send('error', { message: 'Run not found', runId: context.runId });
    return { terminal: true, cursors };
  }

  let nextRunUpdatedAt = cursors.lastRunUpdatedAt;
  let nextNodeCursor = cursors.lastNodeCursor;
  let nextEventCursor = cursors.lastEventCursor;

  const runUpdatedAt = toISOStringSafe(run.updatedAt ?? run.createdAt);
  if (runUpdatedAt !== null && runUpdatedAt !== nextRunUpdatedAt) {
    context.send('run', run);
    nextRunUpdatedAt = runUpdatedAt;
  }

  const nodeList = await getCurrentRunNodes(context.repo, context.runId, cursors.lastNodeCursor);
  if (nodeList.length > 0) {
    context.send('nodes', nodeList);
    nextNodeCursor = resolveLatestNodeCursor(nodeList);
  }

  const eventList = await context.repo.listRunEvents(context.runId, {
    ...(cursors.lastEventCursor === null ? {} : { after: cursors.lastEventCursor }),
    limit: EVENT_BATCH_LIMIT + 1,
  });
  if (eventList.length > 0) {
    const overflow = eventList.length > EVENT_BATCH_LIMIT;
    const events = overflow ? eventList.slice(0, EVENT_BATCH_LIMIT) : eventList;
    context.send('events', { events, overflow, limit: EVENT_BATCH_LIMIT });
    const latestEvent = events[events.length - 1];
    nextEventCursor = resolveLatestEventCursor(latestEvent);
  }

  const terminal = TERMINAL_STATUSES.has(run.status);
  if (terminal) {
    context.send('done', { runId: context.runId, status: run.status });
  }

  return {
    terminal,
    cursors: {
      lastRunUpdatedAt: nextRunUpdatedAt,
      lastNodeCursor: nextNodeCursor,
      lastEventCursor: nextEventCursor,
    },
  };
};

const getCurrentRunNodes = async (
  repo: AiPathRunRepository,
  runId: string,
  lastNodeCursor: { ts: string; nodeId: string } | null
): Promise<AiPathRunRecord[]> => {
  if (lastNodeCursor === null) {
    return repo.listRunNodes(runId);
  }
  return repo.listRunNodesSince(runId, { updatedAt: lastNodeCursor.ts, nodeId: lastNodeCursor.nodeId }, {
    limit: NODE_BATCH_LIMIT,
  });
};

const resolveLatestNodeCursor = (
  changedNodes: AiPathRunRecord[]
): { ts: string; nodeId: string } | null => {
  const latestNode = changedNodes[changedNodes.length - 1];
  if (latestNode === undefined) {
    return null;
  }
  const latestNodeTs = toISOStringSafe(latestNode.updatedAt ?? latestNode.createdAt);
  if (latestNodeTs === null) {
    return null;
  }
  return { ts: latestNodeTs, nodeId: latestNode.nodeId };
};

const resolveLatestEventCursor = (
  latestEvent: { createdAt: string; id: string } | undefined
): { createdAt: string; id: string } | null => {
  if (latestEvent?.createdAt === undefined || latestEvent.id === undefined || latestEvent.id === '') {
    return null;
  }
  return {
    createdAt: latestEvent.createdAt,
    id: latestEvent.id,
  };
};

const streamWithPolling = async (
  context: RunStreamContext,
  state: RunStreamState
): Promise<void> => {
  if (context.isCancelled()) {
    return;
  }

  const previous = state.cursors;
  const result = await sendRunCatchUp(context, state.cursors);
  if (result.terminal) {
    return;
  }

  const activity =
    result.cursors.lastRunUpdatedAt !== previous.lastRunUpdatedAt ||
    result.cursors.lastNodeCursor?.ts !== previous.lastNodeCursor?.ts ||
    result.cursors.lastEventCursor?.id !== previous.lastEventCursor?.id;
  const nextInterval = activity
    ? POLL_INTERVAL_MIN_MS
    : Math.min(state.intervalMs * POLL_BACKOFF_MULTIPLIER, POLL_INTERVAL_MAX_MS);

  await sleep(nextInterval);
  await streamWithPolling(context, {
    intervalMs: nextInterval,
    cursors: {
      lastRunUpdatedAt: result.cursors.lastRunUpdatedAt,
      lastNodeCursor: result.cursors.lastNodeCursor,
      lastEventCursor: result.cursors.lastEventCursor,
    },
  });
};

type PubSubRuntime = {
  context: RunStreamContext;
  cursors: RunCursors;
  done: boolean;
  disconnected: boolean;
  lastActivityMs: number;
  lastCatchUpMs: number;
};

const createMessageHandler = (
  runtime: PubSubRuntime,
  doneSetter: (value: boolean) => void
): ((channel: string, rawMessage: string) => void) => {
  return (_channel: string, rawMessage: string): void => {
    if (runtime.done || runtime.context.isCancelled()) {
      return;
    }
    runtime.lastActivityMs = Date.now();
    try {
      const msg = JSON.parse(rawMessage) as PubSubMessage;
      runtime.context.send(msg.type, msg.data);
      if (msg.type === 'done' || msg.type === 'error') {
        doneSetter(true);
      }
    } catch (error) {
      void ErrorSystem.captureException(error);
    }
  };
};

const createDisconnectHandler = (runtime: PubSubRuntime): (() => void) => {
  return (): void => {
    runtime.disconnected = true;
  };
};

const applyCatchUpAndReturn = async (
  runtime: PubSubRuntime,
  channel: string
): Promise<{ shouldStop: boolean; runtime: PubSubRuntime }> => {
  const check = await sendRunCatchUp(runtime.context, runtime.cursors);
  if (!check.terminal && check.cursors !== runtime.cursors) {
    runtime.cursors = check.cursors;
  }
  const shouldStop = check.terminal;
  if (!check.terminal) {
    runtime.lastCatchUpMs = Date.now();
  }
  if (check.terminal || shouldStop) {
    return { shouldStop: true, runtime };
  }
  if (runtime.cursors.lastRunUpdatedAt !== runtime.cursors.lastRunUpdatedAt) {
    runtime.lastActivityMs = Date.now();
  }
  return { shouldStop: false, runtime };
};

const handlePubSubCycle = async (
  runtime: PubSubRuntime,
  channel: string,
  sub: { off: (event: string, handler: (...args: unknown[]) => void) => void; unsubscribe: (ch: string) => Promise<void> }
): Promise<void> => {
  if (runtime.done || runtime.context.isCancelled()) {
    return;
  }
  await sleep(POLL_CYCLE_MS);

  if (runtime.disconnected || !isSubscriberConnected()) {
    try {
      sub.off('message', () => void undefined);
      await sub.unsubscribe(channel);
    } catch (error) {
      void ErrorSystem.captureException(error);
    }
    await streamWithPolling(runtime.context, {
      intervalMs: POLL_INTERVAL_MIN_MS,
      cursors: runtime.cursors,
    });
    return;
  }

  const now = Date.now();
  if (now - runtime.lastCatchUpMs >= PUBSUB_CATCHUP_INTERVAL_MS) {
    const { shouldStop, runtime: updatedRuntime } = await applyCatchUpAndReturn(runtime, channel);
    runtime.cursors = updatedRuntime.cursors;
    runtime.lastCatchUpMs = updatedRuntime.lastCatchUpMs;
    if (shouldStop) {
      return;
    }
  }

  if (now - runtime.lastActivityMs > PUBSUB_IDLE_TIMEOUT_MS) {
    const { shouldStop, runtime: updatedRuntime } = await applyCatchUpAndReturn(runtime, channel);
    runtime.cursors = updatedRuntime.cursors;
    if (shouldStop) {
      return;
    }
    runtime.lastActivityMs = now;
  }

  await handlePubSubCycle(runtime, channel, sub);
};

const streamWithPubSub = async (
  context: RunStreamContext,
  initialCursors: RunCursors
): Promise<void> => {
  const sub = getRedisSubscriber();
  if (sub === null || !isSubscriberConnected()) {
    await streamWithPolling(context, { intervalMs: POLL_INTERVAL_MIN_MS, cursors: initialCursors });
    return;
  }

  const channel = `ai-paths:run:${context.runId}`;
  const runtime: PubSubRuntime = {
    context,
    cursors: initialCursors,
    done: false,
    disconnected: false,
    lastActivityMs: Date.now(),
    lastCatchUpMs: 0,
  };
  const setDone = (value: boolean): void => {
    runtime.done = value;
  };

  const messageHandler = createMessageHandler(runtime, setDone);
  const disconnectHandler = createDisconnectHandler(runtime);

  try {
    sub.on('end', disconnectHandler);
    sub.on('close', disconnectHandler);
    sub.on('message', messageHandler);
    await sub.subscribe(channel);

    const initialCatchUp = await sendRunCatchUp(context, runtime.cursors);
    runtime.cursors = initialCatchUp.cursors;
    runtime.lastCatchUpMs = Date.now();
    if (initialCatchUp.terminal) {
      return;
    }

    await handlePubSubCycle(runtime, channel, sub);
  } finally {
    try {
      sub.off('message', messageHandler);
      sub.off('end', disconnectHandler);
      sub.off('close', disconnectHandler);
      await sub.unsubscribe(channel);
    } catch (error) {
      void ErrorSystem.captureException(error);
    }
  }
};

const createInitialCursors = (initialRun: AiPathRunRecord, querySince: Date | null): RunCursors => ({
  lastRunUpdatedAt: toISOStringSafe(initialRun.updatedAt ?? initialRun.createdAt),
  lastNodeCursor: null,
  lastEventCursor: querySince === null ? null : { createdAt: querySince.toISOString(), id: '' },
});

const createStreamHeaders = (
  readProvider: string,
  routeMode: 'explicit' | 'fallback',
  repoProvider: 'mongodb'
): Record<string, string> => ({
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Ai-Paths-Run-Provider': repoProvider,
  'X-Ai-Paths-Run-Route-Mode': routeMode,
  'X-Ai-Paths-Run-Read-Provider': readProvider,
  'X-Ai-Paths-Run-Read-Mode': 'selected',
});

export async function getAiPathRunStreamHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const { runId } = params;
  const access = await requireAiPathsRunAccess();
  const repoSelection = await resolvePathRunRepository();
  const initialRun = await repoSelection.repo.findRunById(runId);
  if (initialRun === null) {
    throw notFoundError('Run not found', { runId });
  }
  assertAiPathRunAccess(access, initialRun);

  const query = querySchema.parse(_ctx.query ?? {});
  const initialSince = parseSinceParam(query.since ?? null);
  const encoder = new TextEncoder();
  const initialCursors = createInitialCursors(initialRun, initialSince);

  let cancelled = false;
  req.signal.addEventListener('abort', () => {
    cancelled = true;
  });

  const stream = new ReadableStream({
    async start(controller): Promise<void> {
      const send = (event: string, data: unknown): void => {
        if (cancelled) {
          return;
        }
        const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };
      const sendComment = (comment: string): void => {
        if (cancelled) {
          return;
        }
        controller.enqueue(encoder.encode(`: ${comment}\n\n`));
      };
      const keepAliveTimer = safeSetInterval(() => {
        sendComment('keepalive');
      }, STREAM_KEEPALIVE_INTERVAL_MS);
      const context: RunStreamContext = {
        repo: repoSelection.repo,
        runId,
        send,
        isCancelled: (): boolean => cancelled,
      };

      try {
        send('ready', {
          runId,
          repository: {
            selectedProvider: repoSelection.provider,
            selectedRouteMode: repoSelection.routeMode,
            readProvider: repoSelection.provider,
            readMode: 'selected',
          },
        });
        send('run', initialRun);

        if (TERMINAL_STATUSES.has(initialRun.status)) {
          send('done', { runId, status: initialRun.status });
          controller.close();
          return;
        }

        await streamWithPubSub(context, initialCursors);
        controller.close();
      } finally {
        safeClearInterval(keepAliveTimer);
      }
    },
    cancel(): void {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: createStreamHeaders(
      repoSelection.provider,
      repoSelection.routeMode,
      repoSelection.provider
    ),
  });
}
