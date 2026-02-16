

import { Redis } from 'ioredis';
import { NextRequest } from 'next/server';

import { getImageStudioRunById } from '@/features/ai/image-studio/server/run-repository';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const REDIS_CONNECT_TIMEOUT_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 15000;
const TERMINAL_STATUSES = new Set(['completed', 'failed']);

const buildSseFrame = (payload: unknown): string => `data: ${JSON.stringify(payload)}\n\n`;

const createSubscriber = (): Redis | null => {
  const redisUrl = process.env['REDIS_URL'];
  if (!redisUrl) return null;

  return new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
    retryStrategy: () => null,
    ...(process.env['REDIS_TLS'] === 'true' ? { tls: {} } : {}),
  });
};

export async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const runId = params.runId?.trim();
  if (!runId) {
    throw badRequestError('Run id is required.');
  }

  const initialRun = await getImageStudioRunById(runId);
  if (!initialRun) {
    throw notFoundError('Run not found', { runId });
  }

  const encoder = new TextEncoder();
  let cancelled = false;
  let stopStream: (() => Promise<void>) | null = null;
  req.signal.addEventListener('abort', () => {
    cancelled = true;
    if (stopStream) {
      void stopStream();
    }
  });

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
      let subscriber: Redis | null = null;
      const channel = `image-studio:run:${runId}`;

      const send = (payload: unknown): void => {
        if (cancelled || closed) return;
        controller.enqueue(encoder.encode(buildSseFrame(payload)));
      };

      const closeStream = async (): Promise<void> => {
        if (closed) return;
        closed = true;
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        if (subscriber) {
          try {
            subscriber.removeAllListeners('message');
            await subscriber.unsubscribe(channel);
          } catch {
            // best-effort cleanup
          }
          try {
            await subscriber.quit();
          } catch {
            subscriber.disconnect();
          }
          subscriber = null;
        }
        controller.close();
      };
      stopStream = closeStream;

      send({ type: 'ready', data: { runId } });
      send({
        type: 'snapshot',
        data: {
          runId: initialRun.id,
          status: initialRun.status,
          errorMessage: initialRun.errorMessage,
          expectedOutputs: initialRun.expectedOutputs,
          outputCount: initialRun.outputs.length,
        },
      });

      if (TERMINAL_STATUSES.has(initialRun.status)) {
        send({ type: 'done', data: { runId: initialRun.id, status: initialRun.status } });
        await closeStream();
        return;
      }

      subscriber = createSubscriber();
      if (!subscriber) {
        send({ type: 'fallback', data: { reason: 'redis_unavailable' } });
        await closeStream();
        return;
      }

      const onMessage = (_incomingChannel: string, rawMessage: string): void => {
        if (cancelled || closed) return;
        try {
          const parsed = JSON.parse(rawMessage) as { type?: string; data?: unknown };
          send(parsed);
          if (parsed?.type === 'done' || parsed?.type === 'error') {
            void closeStream();
          }
          return;
        } catch {
          send({ type: 'message', data: rawMessage });
        }
      };

      subscriber.on('message', onMessage);

      try {
        await subscriber.connect();
        await subscriber.subscribe(channel);
      } catch {
        send({ type: 'fallback', data: { reason: 'redis_stream_connect_failed' } });
        await closeStream();
        return;
      }

      heartbeatTimer = setInterval(() => {
        send({ type: 'heartbeat', ts: Date.now() });
      }, HEARTBEAT_INTERVAL_MS);
    },
    cancel() {
      cancelled = true;
      if (stopStream) {
        void stopStream();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

