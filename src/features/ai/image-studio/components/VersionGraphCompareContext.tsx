'use client';

import React from 'react';

import type { VersionNode } from '../context/VersionGraphContext';
import type { ImageStudioSlotRecord } from '../types';

type VersionGraphCompareContextValue = {
  compareNodes: readonly [VersionNode, VersionNode];
  getSlotImageSrc: (slot: ImageStudioSlotRecord) => string | null;
  onSwap: () => void;
  onExit: () => void;
};

const VersionGraphCompareContext = React.createContext<VersionGraphCompareContextValue | null>(null);

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
    throw new Error('useVersionGraphCompareContext must be used inside VersionGraphCompareProvider');
  }
  return context;
}
