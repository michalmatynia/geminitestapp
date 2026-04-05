'use client';

import React from 'react';

import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type { VersionNode } from '../context/VersionGraphContext';

type VersionGraphCompareContextValue = {
  compareNodes: readonly [VersionNode, VersionNode];
  getSlotImageSrc: (slot: ImageStudioSlotRecord) => string | null;
  onOpenDetails?: ((id: string) => void) | undefined;
  onSwap: () => void;
  onExit: () => void;
};

const { Context: VersionGraphCompareContext, useStrictContext: useVersionGraphCompareContext } =
  createStrictContext<VersionGraphCompareContextValue>({
    hookName: 'useVersionGraphCompareContext',
    providerName: 'VersionGraphCompareProvider',
    displayName: 'VersionGraphCompareContext',
    errorFactory: () =>
      internalError('useVersionGraphCompareContext must be used inside VersionGraphCompareProvider'),
  });

export function VersionGraphCompareProvider({
  value,
  children,
}: {
  value: VersionGraphCompareContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <VersionGraphCompareContext.Provider value={value}>
      {children}
    </VersionGraphCompareContext.Provider>
  );
}
export { useVersionGraphCompareContext };
