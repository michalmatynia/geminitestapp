import 'server-only';

import { Redis } from 'ioredis';

import { getRedisClient, isRedisEnabled } from '@/shared/lib/redis';

let subscriber: Redis | null = null;

const logWarning = async (message: string, context: { service: string; circuitId: string; failures: number; resetTimeoutMs: number; lastError: string }): Promise<void> => {
  try {
     
    const mod = await import('@/features/observability/server');
    await mod.ErrorSystem.logWarning(message, context);
  } catch {
    // ignore
  }
};

const captureException = async (error: unknown, context: { source: string; context: { action: string } }): Promise<void> => {
  try {
     
    const mod = await import('@/features/observability/server');
    await mod.ErrorSystem.captureException(error, {
      service: context.source,
      ...context.context,
    });
  } catch {
    // ignore
  }
};

const PUBLISH_CIRCUIT_ID = 'redis-pubsub-publish';
const PUBLISH_FAILURE_THRESHOLD = 5;
const PUBLISH_RESET_TIMEOUT_MS = 30_000;

// Manual circuit breaker state for fire-and-forget publish.
// We can't use withCircuitBreaker() because it's async and throws,
// but publishRunEvent is synchronous fire-and-forget.
let publishFailures = 0;
let lastPublishFailureMs = 0;
let publishCircuitOpen = false;

const recordPublishFailure = (err: unknown): void => {
  publishFailures++;
  lastPublishFailureMs = Date.now();

  if (publishFailures >= PUBLISH_FAILURE_THRESHOLD && !publishCircuitOpen) {
    publishCircuitOpen = true;
    void logWarning(
      `[redis-pubsub] Circuit breaker opened after ${publishFailures} publish failures`,
      {
        service: 'redis-pubsub',
        circuitId: PUBLISH_CIRCUIT_ID,
        failures: publishFailures,
        resetTimeoutMs: PUBLISH_RESET_TIMEOUT_MS,
        lastError: err instanceof Error ? err.message : String(err),
      }
    );
  }
};

const recordPublishSuccess = (): void => {
  if (publishFailures > 0 || publishCircuitOpen) {
    publishFailures = 0;
    publishCircuitOpen = false;
  }
};

/**
 * Check if the publish circuit breaker is healthy (closed).
 * Returns false when too many consecutive publish failures have occurred.
 */
export function isPublishCircuitHealthy(): boolean {
  if (!publishCircuitOpen) return true;
  // Check if reset timeout has elapsed (half-open)
  if (Date.now() - lastPublishFailureMs >= PUBLISH_RESET_TIMEOUT_MS) {
    return true; // Allow a probe attempt
  }
  return false;
}

/**
 * Returns a dedicated Redis connection for subscriptions.
 * Redis enters subscriber mode after SUBSCRIBE, blocking all other commands,
 * so this must be a separate instance from the main client.
 */
export function getRedisSubscriber(): Redis | null {
  if (!isRedisEnabled()) return null;
  if (subscriber) return subscriber;

  const url = process.env['REDIS_URL'];
  if (!url) return null;

  try {
    subscriber = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      ...(process.env['REDIS_TLS'] === 'true' ? { tls: {} } : {}),
    });
    subscriber.on('error', (err) => {
      void captureException(err, { source: 'redis-pubsub', context: { action: 'subscriber_connection_error' } });
    });
  } catch (error) {
    void captureException(error, { source: 'redis-pubsub', context: { action: 'create_subscriber_failed' } });
    return null;
  }

  return subscriber;
}

/**
 * Check if the subscriber connection is ready to receive messages.
 */
export function isSubscriberConnected(): boolean {
  if (!subscriber) return false;
  return subscriber.status === 'ready';
}

export async function closeSubscriber(): Promise<void> {
  if (subscriber) {
    try {
      await subscriber.quit();
    } catch {
      // Already disconnected
    }
    subscriber = null;
  }
}

/**
 * Fire-and-forget publish via the main Redis client.
 * Protected by a circuit breaker: after 5 consecutive failures,
 * publishing is skipped for 30s before allowing a probe attempt.
 */
export function publishRunEvent(channel: string, data: unknown): void {
  if (!isRedisEnabled()) return;
  if (!isPublishCircuitHealthy()) return;

  const client = getRedisClient();
  if (!client) return;

  try {
    const payload = JSON.stringify(data);
    void client.publish(channel, payload).then(
      () => {
        recordPublishSuccess();
      },
      (err: unknown) => {
        recordPublishFailure(err);
      }
    );
  } catch (err) {
    recordPublishFailure(err);
  }
}
