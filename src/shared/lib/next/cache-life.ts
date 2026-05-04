/**
 * Next.js Cache Life Configuration
 * 
 * Wrapper for Next.js cache lifecycle management.
 * Provides:
 * - Configurable cache duration profiles
 * - Stale-while-revalidate patterns
 * - Cache expiration and revalidation strategies
 * - Type-safe cache configuration
 */

import { cacheLife } from 'next/cache';

type CacheLifeProfile =
  | string
  | {
      stale?: number; // Duration content is served stale
      revalidate?: number; // Revalidation interval
      expire?: number; // Hard expiration time
    };

export const applyCacheLife = (profile: CacheLifeProfile): void => {
  if (process.env['NODE_ENV'] === 'test') {
    return;
  }

  try {
    cacheLife(profile as never);
  } catch (error) {
    if (error instanceof Error && error.message.includes('`cacheComponents` config')) {
      return;
    }
    throw error;
  }
};
