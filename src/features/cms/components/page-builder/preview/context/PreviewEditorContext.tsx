'use client';

import React, { createContext, useContext, useMemo } from 'react';

import type { InspectorSettings } from '@/features/cms/types/page-builder';
import type { MediaReplaceTarget } from '../preview-utils';
import { internalError } from '@/shared/errors/app-error';

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

export type PreviewEditorStateContextValue = Omit<
  PreviewEditorContextValue,
  | 'onSelect'
  | 'onHoverNode'
  | 'onOpenMedia'
  | 'onRemoveSection'
  | 'onToggleSectionVisibility'
  | 'onRemoveRow'
>;

export type PreviewEditorActionsContextValue = Pick<
  PreviewEditorContextValue,
  | 'onSelect'
  | 'onHoverNode'
  | 'onOpenMedia'
  | 'onRemoveSection'
  | 'onToggleSectionVisibility'
  | 'onRemoveRow'
>;

const PreviewEditorStateContext = createContext<PreviewEditorStateContextValue | undefined>(
  undefined
);
const PreviewEditorActionsContext = createContext<PreviewEditorActionsContextValue | undefined>(
  undefined
);

export function PreviewEditorProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: PreviewEditorContextValue;
}): React.JSX.Element {
  const stateValue = useMemo(
    (): PreviewEditorStateContextValue => ({
      selectedNodeId: value.selectedNodeId,
      isInspecting: value.isInspecting,
      inspectorSettings: value.inspectorSettings,
      hoveredNodeId: value.hoveredNodeId,
      pauseSlideshowOnHoverInEditor: value.pauseSlideshowOnHoverInEditor,
    }),
    [
      value.selectedNodeId,
      value.isInspecting,
      value.inspectorSettings,
      value.hoveredNodeId,
      value.pauseSlideshowOnHoverInEditor,
    ]
  );
  const actionsValue = useMemo(
    (): PreviewEditorActionsContextValue => ({
      onSelect: value.onSelect,
      onHoverNode: value.onHoverNode,
      onOpenMedia: value.onOpenMedia,
      onRemoveSection: value.onRemoveSection,
      onToggleSectionVisibility: value.onToggleSectionVisibility,
      onRemoveRow: value.onRemoveRow,
    }),
    [
      value.onSelect,
      value.onHoverNode,
      value.onOpenMedia,
      value.onRemoveSection,
      value.onToggleSectionVisibility,
      value.onRemoveRow,
    ]
  );

  return (
    <PreviewEditorActionsContext.Provider value={actionsValue}>
      <PreviewEditorStateContext.Provider value={stateValue}>
        {children}
      </PreviewEditorStateContext.Provider>
    </PreviewEditorActionsContext.Provider>
  );
}

export function usePreviewEditorState(): PreviewEditorStateContextValue {
  const context = useContext(PreviewEditorStateContext);
  if (context === undefined) {
    throw internalError('usePreviewEditorState must be used within a PreviewEditorProvider');
  }
  return context;
}

export function usePreviewEditorActions(): PreviewEditorActionsContextValue {
  const context = useContext(PreviewEditorActionsContext);
  if (context === undefined) {
    throw internalError('usePreviewEditorActions must be used within a PreviewEditorProvider');
  }
  return context;
}

export function useOptionalPreviewEditorState(): PreviewEditorStateContextValue | undefined {
  return useContext(PreviewEditorStateContext);
}

export function useOptionalPreviewEditorActions(): PreviewEditorActionsContextValue | undefined {
  return useContext(PreviewEditorActionsContext);
}
