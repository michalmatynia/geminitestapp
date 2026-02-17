'use client';

import React from 'react';

import type { VersionNode } from '../context/VersionGraphContext';
import type { ImageStudioSlotRecord } from '../types';

type VersionGraphInspectorContextValue = {
  selectedNode: VersionNode | null;
  compositeLoading: boolean;
  compositeBusy: boolean;
  getSlotImageSrc: (slot: ImageStudioSlotRecord) => string | null;
  onFlattenComposite: (slotId: string) => void;
  onRefreshCompositePreview?: ((slotId: string) => void) | undefined;
  onSelectNode: (id: string | null) => void;
  onOpenDetails?: ((id: string) => void) | undefined;
  onFocusNode?: ((id: string) => void) | undefined;
  onIsolateBranch?: ((id: string) => void) | undefined;
  annotationDraft: string;
  onAnnotationChange: (value: string) => void;
  onAnnotationBlur: () => void;
};

const VersionGraphInspectorContext = React.createContext<VersionGraphInspectorContextValue | null>(null);

export function VersionGraphInspectorProvider({
  value,
  children,
}: {
  value: VersionGraphInspectorContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <VersionGraphInspectorContext.Provider value={value}>
      {children}
    </VersionGraphInspectorContext.Provider>
  );
}

export function useVersionGraphInspectorContext(): VersionGraphInspectorContextValue {
  const context = React.useContext(VersionGraphInspectorContext);
  if (!context) {
    throw new Error('useVersionGraphInspectorContext must be used inside VersionGraphInspectorProvider');
  }
  return context;
}
