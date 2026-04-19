'use client';

import { useKangurDeferredStandaloneHomeReady } from './useKangurDeferredStandaloneHomeReady';

export function useKangurDeferredHomeTutorContextReady(): boolean {
  return useKangurDeferredStandaloneHomeReady();
}
