import 'server-only';

import { logger } from '@/shared/utils/logger';

import type { ManagedQueue, QueueHealthStatus } from './types';

const registry = new Map<string, ManagedQueue<unknown>>();

export const registerQueue = (name: string, queue: ManagedQueue<unknown>): void => {
  registry.set(name, queue);
};

export const getRegisteredQueue = (name: string): ManagedQueue<unknown> | undefined => {
  return registry.get(name);
};

export const getQueueHealth = async (): Promise<Record<string, QueueHealthStatus>> => {
  const entries = Array.from(registry.entries());
  const results = await Promise.all(
    entries.map(async ([name, queue]) => {
      const status = await queue.getHealthStatus();
      return [name, status] as const;
    }),
  );
  return Object.fromEntries(results);
};

export const startAllWorkers = (): void => {
  for (const [name, queue] of registry.entries()) {
    logger.info(`[queue-registry] Starting queue worker: ${name}`, { queueName: name });
    queue.startWorker();
  }
};

export const stopAllWorkers = async (): Promise<void> => {
  const entries = Array.from(registry.values());
  await Promise.all(entries.map((queue) => queue.stopWorker()));
  logger.info('[queue-registry] All queue workers stopped');
};
