'use client';

import React from 'react';

import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';

import type { VersionEdge, VersionNode } from '../context/VersionGraphContext';

type VersionNodeMapContextValue = {
  nodes: VersionNode[];
  edges: VersionEdge[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  mergeMode: boolean;
  mergeSelectedIds: string[];
  collapsedNodeIds: Set<string>;
  filteredNodeIds: Set<string> | null;
  isolatedNodeIds: Set<string> | null;
  compositeMode: boolean;
  compositeSelectedIds: string[];
  compareMode: boolean;
  compareNodeIds: [string, string] | null;
  onSelectNode: (id: string | null) => void;
  onHoverNode: (id: string | null) => void;
  onActivateNode: (id: string) => void;
  onOpenNodeDetails?: ((id: string) => void) | undefined;
  onToggleMergeSelection: (id: string) => void;
  onToggleCompositeSelection: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onReorderCompositeLayer: (compositeSlotId: string, fromIndex: number, toIndex: number) => void;
  onContextMenu?: ((nodeId: string, clientX: number, clientY: number) => void) | undefined;
  getSlotImageSrc: (slot: ImageStudioSlotRecord) => string | null;
  getSlotAnnotation?: ((slot: ImageStudioSlotRecord) => string | undefined) | undefined;
  zoom: number;
  onZoomChange: (z: number) => void;
  pan: { x: number; y: number };
  viewportWidth: number;
  viewportHeight: number;
  onPanTo: (x: number, y: number) => void;
};

const VersionNodeMapContext = React.createContext<VersionNodeMapContextValue | null>(null);

export function VersionNodeMapProvider({
  value,
  children,
}: {
  value: VersionNodeMapContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <VersionNodeMapContext.Provider value={value}>
      {children}
    </VersionNodeMapContext.Provider>
  );
}

export function useVersionNodeMapContext(): VersionNodeMapContextValue {
  const context = React.useContext(VersionNodeMapContext);
  if (!context) {
    throw new Error('useVersionNodeMapContext must be used inside VersionNodeMapProvider');
  }
  return context;
}
