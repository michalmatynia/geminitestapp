import { cacheLife } from 'next/cache';

type CacheLifeProfile =
  | string
  | {
      stale?: number;
      revalidate?: number;
      expire?: number;
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
