'use client';

import React, { createContext, useContext } from 'react';

import type { InspectorSettings } from '../../../../types/page-builder';
import type { MediaReplaceTarget } from '../preview-utils';

export interface PreviewEditorContextValue {
  selectedNodeId: string | null;
  isInspecting: boolean;
  inspectorSettings: InspectorSettings;
  hoveredNodeId: string | null;
  onSelect: (nodeId: string) => void;
  onHoverNode: (nodeId: string | null) => void;
  onOpenMedia?: (target: MediaReplaceTarget) => void;
  onRemoveSection?: (sectionId: string) => void;
  onToggleSectionVisibility?: (sectionId: string, isHidden: boolean) => void;
  onRemoveRow?: (sectionId: string, rowId: string) => void;
  pauseSlideshowOnHoverInEditor: boolean;
}

const PreviewEditorContext = createContext<PreviewEditorContextValue | undefined>(undefined);

export function PreviewEditorProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: PreviewEditorContextValue;
}): React.JSX.Element {
  return (
    <PreviewEditorContext.Provider value={value}>
      {children}
    </PreviewEditorContext.Provider>
  );
}

export function usePreviewEditor(): PreviewEditorContextValue {
  const context = useContext(PreviewEditorContext);
  if (context === undefined) {
    throw new Error('usePreviewEditor must be used within a PreviewEditorProvider');
  }
  return context;
}

export function useOptionalPreviewEditor(): PreviewEditorContextValue | undefined {
  return useContext(PreviewEditorContext);
}