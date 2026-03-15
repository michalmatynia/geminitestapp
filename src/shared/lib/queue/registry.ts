import 'server-only';

import type { ManagedQueue, QueueHealthStatus } from '@/shared/contracts/jobs';

import { logSystemEvent } from '../observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


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
    })
  );
  return Object.fromEntries(results);
};

export const startAllWorkers = (options?: { excludeQueueNames?: readonly string[] }): void => {
  const excluded = new Set(options?.excludeQueueNames ?? []);
  for (const [name, queue] of registry.entries()) {
    if (excluded.has(name)) {
      continue;
    }
    void logSystemEvent({
      level: 'info',
      message: `[queue-registry] Starting queue worker: ${name}`,
      source: 'queue-registry',
      context: { queueName: name },
    });
    try {
      queue.startWorker();
    } catch (error) {
      void ErrorSystem.captureException(error);
      void logSystemEvent({
        level: 'error',
        message: `[queue-registry] Failed to start queue worker: ${name}`,
        source: 'queue-registry',
        error,
        context: { queueName: name },
      });
    }
  }
};

export const stopAllWorkers = async (): Promise<void> => {
  const entries = Array.from(registry.values());
  await Promise.all(entries.map((queue) => queue.stopWorker()));
  void logSystemEvent({
    level: 'info',
    message: '[queue-registry] All queue workers stopped',
    source: 'queue-registry',
  });
};
