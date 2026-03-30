import { logger } from '@/shared/utils/logger';

export type ErrorEnricher = (
  error: unknown,
  context: Record<string, unknown>
) => Promise<void> | void;

const enrichers = new Set<ErrorEnricher>();

/**
 * Register a global error enricher (e.g. for Agent Audit logging).
 * This allows features to hook into the shared ErrorSystem without
 * creating circular dependencies.
 */
export function registerErrorEnricher(enricher: ErrorEnricher): () => void {
  enrichers.add(enricher);
  return () => {
    enrichers.delete(enricher);
  };
}

export async function notifyErrorEnrichers(
  error: unknown,
  context: Record<string, unknown>
): Promise<void> {
  const tasks: Promise<void>[] = [];
  for (const enricher of enrichers) {
    try {
      const result = enricher(error, context);
      if (result instanceof Promise) {
        tasks.push(result);
      }
    } catch (enricherError) {
      logger.error('[ErrorSystem] Enricher failed', enricherError);
    }
  }
  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }
}
