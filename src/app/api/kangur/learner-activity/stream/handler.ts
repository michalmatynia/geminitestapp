import { Redis } from 'ioredis';
import { NextRequest } from 'next/server';

import {
  getKangurLearnerActivityRepository,
  resolveKangurActor,
  requireActiveLearner,
} from '@/features/kangur/server';
import type { KangurLearnerProfile } from '@/features/kangur/services/ports';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError, notFoundError } from '@/shared/errors/app-error';
import { startIntervalTask, type IntervalTaskHandle } from '@/shared/lib/timers';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const REDIS_CONNECT_TIMEOUT_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 15_000;
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

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

const isRecentActivity = (timestamp: string | null | undefined): boolean => {
  if (!timestamp) {
    return false;
  }
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) {
    return false;
  }
  return Date.now() - parsed <= ONLINE_WINDOW_MS;
};

const resolveActiveLearner = (
  actor: Awaited<ReturnType<typeof resolveKangurActor>>,
  requestedLearnerId: string | null
): KangurLearnerProfile => {
  if (actor.actorType === 'parent') {
    if (requestedLearnerId) {
      const matched = actor.learners.find((learner) => learner.id === requestedLearnerId);
      if (!matched) {
        throw notFoundError('Learner not found.', { learnerId: requestedLearnerId });
      }
      return matched;
    }
    return requireActiveLearner(actor);
  }

  if (requestedLearnerId && requestedLearnerId !== actor.activeLearner.id) {
    throw forbiddenError('Learner id mismatch.');
  }

  return actor.activeLearner;
};

export async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const requestedLearnerId = new URL(req.url).searchParams.get('learnerId')?.trim() || null;
  const actor = await resolveKangurActor(req);
  const activeLearner = resolveActiveLearner(actor, requestedLearnerId);
  const repository = await getKangurLearnerActivityRepository();
  const snapshot = await repository.getActivity(activeLearner.id);
  const status = {
    snapshot,
    isOnline: isRecentActivity(snapshot?.updatedAt),
  };

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
      const channel = `kangur:learner-activity:${activeLearner.id}`;

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
            await subscriber.unsubscribe(channel);
          } catch (error) {
            void ErrorSystem.captureException(error);
          
            // best-effort cleanup
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

      send({ type: 'ready', data: { learnerId: activeLearner.id } });
      send({ type: 'snapshot', data: status });

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
        await subscriber.subscribe(channel);
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
