/**
 * Queue Management System
 * 
 * Centralized job queue infrastructure built on Redis and Bull.
 * Provides:
 * - Managed queue creation with standardized configuration
 * - Redis connection pooling and health monitoring
 * - Queue registry for centralized management
 * - Worker lifecycle management (start/stop all queues)
 * - Health checks and monitoring capabilities
 * 
 * This system enables reliable background job processing
 * with proper resource management and observability.
 */

export {
  getRedisConnection,
  isRedisAvailable,
  isRedisReachable,
  closeRedisConnection,
} from './redis-connection';
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
