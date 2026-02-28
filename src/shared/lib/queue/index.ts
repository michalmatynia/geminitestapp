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
