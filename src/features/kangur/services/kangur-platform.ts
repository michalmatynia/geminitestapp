'use client';

import { createLocalKangurPlatform } from '@/features/kangur/services/local-kangur-platform';
import type { KangurPlatform } from '@/features/kangur/services/ports';

let cachedPlatform: KangurPlatform | null = null;

export const getKangurPlatform = (): KangurPlatform => {
  if (!cachedPlatform) {
    cachedPlatform = createLocalKangurPlatform();
  }
  return cachedPlatform;
};
