'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

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

const {
  Context: VersionGraphContextMenuContext,
  useStrictContext: useVersionGraphContextMenuContext,
} = createStrictContext<VersionGraphContextMenuValue>({
  hookName: 'useVersionGraphContextMenuContext',
  providerName: 'VersionGraphContextMenuProvider',
  displayName: 'VersionGraphContextMenuContext',
  errorFactory: () =>
    internalError(
      'useVersionGraphContextMenuContext must be used inside VersionGraphContextMenuProvider'
    ),
});

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
export { useVersionGraphContextMenuContext };
