import 'server-only';

import { QueueEvents } from 'bullmq';
import type { Queue } from 'bullmq';

import type { ManagedQueue } from '@/shared/contracts/jobs';
import { serviceUnavailableError } from '@/shared/errors/app-error';

import { getRedisConnection } from './redis-connection';

type BullMqQueueEventsConnection = NonNullable<
  ConstructorParameters<typeof QueueEvents>[1]
>['connection'];

const isBullQueue = (value: unknown): value is Queue =>
  typeof value === 'object' && value !== null && 'getJob' in value;

export async function waitForManagedQueueJobResult<TJobData, TResult>(
  queue: ManagedQueue<TJobData>,
  input: {
    jobId: string;
    queueName: string;
    timeoutMs: number;
  }
): Promise<TResult> {
  const bullQueue = queue.getQueue();
  // Type guard ensures we're working with BullMQ queue, not an inline fallback implementation.
  if (!isBullQueue(bullQueue)) {
    throw serviceUnavailableError('Redis queue is unavailable. Configure Redis and retry.', 3_000, {
      queue: input.queueName,
    });
  }

  const baseConnection = getRedisConnection();
  if (baseConnection === null) {
    throw serviceUnavailableError('Redis runtime is unavailable. Configure Redis and retry.', 3_000, {
      queue: input.queueName,
    });
  }

  // Duplicate the connection to create an independent event listener; prevents interference with queue operations.
  const eventsConnection = baseConnection.duplicate();
  const queueEvents = new QueueEvents(input.queueName, {
    connection: eventsConnection as BullMqQueueEventsConnection,
  });

  try {
    await queueEvents.waitUntilReady();
    const job = await bullQueue.getJob(input.jobId);
    if (job === undefined) {
      throw serviceUnavailableError('Redis upload job was not found. Please retry.', 3_000, {
        jobId: input.jobId,
        queue: input.queueName,
      });
    }
    // Block on the job until it completes or timeout, streaming events to allow real-time updates.
    return (await job.waitUntilFinished(queueEvents, input.timeoutMs)) as TResult;
  } finally {
    // Clean up event listeners and connections to prevent resource leaks and dangling subscriptions.
    await queueEvents.close().catch(() => undefined);
    eventsConnection.disconnect();
  }
}
