export { getRedisConnection, isRedisAvailable, closeRedisConnection } from './redis-connection';
export { createManagedQueue } from './queue-factory';
export {
  registerQueue,
  getRegisteredQueue,
  getQueueHealth,
  startAllWorkers,
  stopAllWorkers,
} from './registry';
export type {
  QueueName,
  QueueConfig,
  QueueHealthStatus,
  ManagedQueue,
} from '@/shared/contracts/jobs';

/**
 * Process a single job by name and ID.
 * Finds the registered queue and calls processInline.
 */
export async function processSingleJob(queueName: string, data: unknown): Promise<unknown> {
  const { getRegisteredQueue } = await import('./registry');
  const queue = getRegisteredQueue(queueName);
  if (!queue) {
    throw new Error(`Queue not found: ${queueName}`);
  }
  return queue.processInline(data);
}
