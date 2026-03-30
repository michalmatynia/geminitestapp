import { logger } from '@/shared/utils/logger';

export type LogHydrator = (
  ctx: Record<string, unknown> | null | undefined
) => Promise<Record<string, unknown> | null>;

let currentHydrator: LogHydrator | null = null;

/**
 * Register a global log hydrator (e.g. from observability feature).
 * This allows features to provide rich runtime context to shared logs
 * without creating circular dependencies.
 */
export function registerLogHydrator(hydrator: LogHydrator): void {
  currentHydrator = hydrator;
}

export async function hydrateLogContext(
  ctx: Record<string, unknown> | null | undefined
): Promise<Record<string, unknown> | null> {
  if (!currentHydrator) return ctx ?? null;
  try {
    return await currentHydrator(ctx);
  } catch (error) {
    logger.error('[LogHydrationRegistry] Hydrator failed', error);
    return ctx ?? null;
  }
}
