import { Redis } from 'ioredis';
import { type NextRequest } from 'next/server';
import { z } from 'zod';

import { listKangurDuelLobbyChatMessages } from '@/features/kangur/duels/lobby-chat';
import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import {
  KANGUR_DUELS_LOBBY_CHAT_MAX_LIMIT,
  KANGUR_DUELS_LOBBY_CHAT_DEFAULT_LIMIT,
} from '@/shared/contracts/kangur-duels-chat';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { forbiddenError, validationError } from '@/shared/errors/app-error';
import { optionalIntegerQuerySchema } from '@/shared/lib/api/query-schema';
import { startIntervalTask, type IntervalTaskHandle } from '@/shared/lib/timers';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const REDIS_CONNECT_TIMEOUT_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 15_000;
const LOBBY_CHAT_CHANNEL = 'kangur:duels:lobby-chat';

const querySchema = z.object({
  limit: optionalIntegerQuerySchema(
    z.number().int().min(1).max(KANGUR_DUELS_LOBBY_CHAT_MAX_LIMIT)
  ),
});

const buildSseFrame = (payload: unknown): string => `data: ${JSON.stringify(payload)}\n\n`;

const createSubscriber = (): Redis | null => {
  const redisUrl = process.env['REDIS_URL'];
  if (!redisUrl) {
    return null;
  }

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
  _ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.actorType !== 'learner') {
    throw forbiddenError('Only learner accounts can access lobby chat.');
  }
  requireActiveLearner(actor);

  const parsedQuery = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries())
  );
  if (!parsedQuery.success) {
    throw validationError('Invalid query parameters', {
      issues: parsedQuery.error.flatten(),
    });
  }
  const limit = parsedQuery.data.limit ?? KANGUR_DUELS_LOBBY_CHAT_DEFAULT_LIMIT;
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
      let heartbeatTimer: IntervalTaskHandle | null = null;
      let subscriber: Redis | null = null;

      const send = (payload: unknown): void => {
        if (cancelled || closed) return;
        controller.enqueue(encoder.encode(buildSseFrame(payload)));
      };

      const closeStream = async (): Promise<void> => {
        if (closed) return;
        closed = true;
        if (heartbeatTimer) {
          heartbeatTimer.cancel();
          heartbeatTimer = null;
        }
        if (subscriber) {
          try {
            subscriber.removeAllListeners('message');
            await subscriber.unsubscribe(LOBBY_CHAT_CHANNEL);
          } catch (error) {
            void ErrorSystem.captureException(error);
          }
          try {
            await subscriber.quit();
          } catch (error) {
            void ErrorSystem.captureException(error);
            subscriber.disconnect();
          }
          subscriber = null;
        }
        controller.close();
      };

      stopStream = closeStream;

      send({ type: 'ready', data: { limit } });
      const snapshot = await listKangurDuelLobbyChatMessages({ limit });
      send({ type: 'snapshot', data: snapshot });

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
        } catch (error) {
          void ErrorSystem.captureException(error);
          send({ type: 'message', data: rawMessage });
        }
      };

      subscriber.on('message', onMessage);

      try {
        await subscriber.connect();
        await subscriber.subscribe(LOBBY_CHAT_CHANNEL);
      } catch (error) {
        void ErrorSystem.captureException(error);
        send({ type: 'fallback', data: { reason: 'redis_stream_connect_failed' } });
        await closeStream();
        return;
      }

      heartbeatTimer = startIntervalTask(() => {
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
