'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';

import type { VersionNode } from '../context/VersionGraphContext';

type VersionGraphContextMenuValue = {
  menu: { nodeId: string; x: number; y: number };
  node: VersionNode;
  collapsedNodeIds: Set<string>;
  onClose: () => void;
  onDetachSubtree: (nodeId: string) => void;
  onIsolateBranch: (nodeId: string) => void;
  onToggleCollapse: (nodeId: string) => void;
  onAddToComposite: (nodeId: string) => void;
  onCompareWith: (nodeId: string) => void;
  onCopyId: (nodeId: string) => void;
};

const VersionGraphContextMenuContext = React.createContext<VersionGraphContextMenuValue | null>(
  null
);

export function VersionGraphContextMenuProvider({
  value,
  children,
}: {
  value: VersionGraphContextMenuValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <VersionGraphContextMenuContext.Provider value={value}>
      {children}
    </VersionGraphContextMenuContext.Provider>
  );
}

export function useVersionGraphContextMenuContext(): VersionGraphContextMenuValue {
  const context = React.useContext(VersionGraphContextMenuContext);
  if (!context) {
    throw internalError(
      'useVersionGraphContextMenuContext must be used inside VersionGraphContextMenuProvider'
    );
  }
  return context;
}
