'use client';

import React from 'react';

import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { internalError } from '@/shared/errors/app-error';

import type { VersionNode } from '../context/VersionGraphContext';

type VersionGraphCompareContextValue = {
  compareNodes: readonly [VersionNode, VersionNode];
  getSlotImageSrc: (slot: ImageStudioSlotRecord) => string | null;
  onOpenDetails?: ((id: string) => void) | undefined;
  onSwap: () => void;
  onExit: () => void;
};

const VersionGraphCompareContext = React.createContext<VersionGraphCompareContextValue | null>(
  null
);

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

export function useVersionGraphCompareContext(): VersionGraphCompareContextValue {
  const context = React.useContext(VersionGraphCompareContext);
  if (!context) {
    throw internalError(
      'useVersionGraphCompareContext must be used inside VersionGraphCompareProvider'
    );
  }
  return context;
}
