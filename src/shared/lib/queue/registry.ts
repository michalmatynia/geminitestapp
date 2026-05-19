/**
 * Queue Registry
 * 
 * Central registry for managing active queues.
 * Provides:
 * - Queue registration and lookup
 * - Queue health status aggregation
 * - Registry-wide queue management
 * - System event logging
 * - Server-only queue registry
 */

import 'server-only';

import type { ManagedQueue, QueueHealthStatus } from '@/shared/contracts/jobs';

import { logSystemEvent } from '../observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


/** Internal registry map storing all active queues by name. */
const registry = new Map<string, ManagedQueue<unknown>>();

/**
 * Registers a queue in the global registry for lifecycle management and health checks.
 * Called during queue initialization to make the queue discoverable by monitoring systems.
 * 
 * @param name - Unique queue identifier (e.g., 'product-ai', 'ai-paths-runs')
 * @param queue - The ManagedQueue instance to register
 */
export const registerQueue = (name: string, queue: ManagedQueue<unknown>): void => {
  registry.set(name, queue);
};

/**
 * Retrieves a registered queue by name.
 * Returns undefined if the queue has not been registered yet.
 * 
 * @param name - The queue name to look up
 * @returns The ManagedQueue instance, or undefined if not found
 */
export const getRegisteredQueue = (name: string): ManagedQueue<unknown> | undefined => {
  return registry.get(name);
};

/**
 * Aggregates health status across all registered queues.
 * Performs concurrent health checks on every queue in the registry.
 * Useful for monitoring dashboards and system health endpoints.
 * 
 * @returns A record mapping queue names to their current health status (connected, pending jobs, etc.)
 */
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

/**
 * Starts worker processes for all registered queues (with optional exclusions).
 * Typically called during application initialization to begin processing jobs.
 * Logs each startup event and captures errors to observability system.
 * 
 * @param options - Configuration for selective queue startup
 * @param options.excludeQueueNames - Queue names to skip (useful for disabling specific queues in certain environments)
 */
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

/**
 * Gracefully stops all queue workers in the registry.
 * Called during application shutdown to ensure jobs are not dropped and connections are cleaned up.
 * Waits for all workers to stop before returning.
 * 
 * @returns A promise that resolves when all workers have been stopped
 */
export const stopAllWorkers = async (): Promise<void> => {
  const entries = Array.from(registry.values());
  await Promise.all(entries.map((queue) => queue.stopWorker()));
  void logSystemEvent({
    level: 'info',
    message: '[queue-registry] All queue workers stopped',
    source: 'queue-registry',
  });
};
