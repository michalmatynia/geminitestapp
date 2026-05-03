'use client';

import { KangurProgressSyncProvider } from '@/features/kangur/ui/context/KangurProgressSyncProvider';
import { KangurScoreSyncProvider } from '@/features/kangur/ui/context/KangurScoreSyncProvider';

import type { JSX } from 'react';

export function KangurDeferredSyncEffectsClient(): JSX.Element {
  return (
    <>
      <KangurProgressSyncProvider />
      <KangurScoreSyncProvider />
    </>
  );
}
