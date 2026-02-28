import 'server-only';

import { isRedisEnabled } from '@/shared/lib/redis';
import {
  isPublishCircuitHealthy,
  isSubscriberConnected,
  publishRunEvent,
} from '@/shared/lib/redis-pubsub';

export type RunStreamEventType = 'run' | 'nodes' | 'events' | 'done' | 'error';

/**
 * Fire-and-forget publish of a run stream event.
 * SSE route subscribers on channel `ai-paths:run:{runId}` receive instant updates.
 * No-op when Redis is unavailable — the SSE route falls back to DB polling.
 */
export function publishRunUpdate(runId: string, type: RunStreamEventType, data: unknown): void {
  if (!isRedisEnabled()) return;
  publishRunEvent(`ai-paths:run:${runId}`, { type, data, ts: Date.now() });
}

/**
 * Check if the pub/sub streaming system is healthy enough for real-time mode.
 * The SSE route uses this to decide between pub/sub and polling.
 */
export function isPubSubHealthy(): boolean {
  if (!isRedisEnabled()) return false;
  return isPublishCircuitHealthy() && isSubscriberConnected();
}
