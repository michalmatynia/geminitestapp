'use client';

import React, { createContext, useContext, useReducer, useMemo, useState, useCallback, type ReactNode } from 'react';

import type { 
  SectionInstance, 
  BlockInstance,
  PageBuilderState,
  PageBuilderAction,
  InspectorSettings,
} from '@/shared/contracts/cms';
import type { VectorShape } from '@/shared/ui';

import { findSection, findBlock, findColumn } from './page-builder/block-helpers';
import { pageBuilderReducer } from './page-builder/page-builder-reducer';

export { pageBuilderReducer } from './page-builder/page-builder-reducer';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const DEFAULT_INSPECTOR_SETTINGS: InspectorSettings = {
  showTooltip: true,
  showStyleSettings: true,
  showStructureInfo: true,
  showIdentifiers: false,
  showVisibilityInfo: true,
  showConnectionInfo: true,
  showEditorChrome: true,
  showLayoutGuides: true,
  pauseAnimations: false,
};

export const initialState: PageBuilderState = {
  pages: [],
  currentPage: null,
  sections: [],
  selectedNodeId: null,
  inspectorEnabled: false,
  inspectorSettings: DEFAULT_INSPECTOR_SETTINGS,
  previewMode: 'desktop',
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  clipboard: null,
  history: { past: [], future: [] },
};

export interface VectorOverlayResult {
  shapes: VectorShape[];
  path: string;
  points: Array<{ shapeId: string; points: VectorShape['points'] }>;
}

export interface VectorOverlayRequest {
  title: string;
  description?: string;
  initialShapes?: VectorShape[];
  onApply: (result: VectorOverlayResult) => void;
  onCancel?: () => void;
}

interface PageBuilderContextValue {
  state: PageBuilderState;
  dispatch: React.Dispatch<PageBuilderAction>;
  selectedSection: SectionInstance | null;
  selectedBlock: BlockInstance | null;
  selectedParentSection: SectionInstance | null;
  selectedColumn: BlockInstance | null;
  selectedColumnParentSection: SectionInstance | null;
  selectedParentColumn: BlockInstance | null;
  selectedParentRow: BlockInstance | null;
  selectedParentBlock: BlockInstance | null;
  vectorOverlay: VectorOverlayRequest | null;
  openVectorOverlay: (request: VectorOverlayRequest) => void;
  closeVectorOverlay: () => void;
}

const PageBuilderContext = createContext<PageBuilderContextValue | undefined>(
  undefined
);

export function PageBuilderProvider({ 
  children, 
  initialState: customInitialState = initialState 
}: { 
  children: ReactNode;
  initialState?: PageBuilderState;
}): React.ReactNode {
  const [state, dispatch] = useReducer(pageBuilderReducer, customInitialState);
  const [vectorOverlay, setVectorOverlay] = useState<VectorOverlayRequest | null>(null);

  const openVectorOverlay = useCallback((request: VectorOverlayRequest): void => {
    setVectorOverlay(request);
  }, []);

  const closeVectorOverlay = useCallback((): void => {
    setVectorOverlay(null);
  }, []);

  const { selectedSection, selectedBlock, selectedParentSection, selectedColumn, selectedColumnParentSection, selectedParentColumn, selectedParentRow, selectedParentBlock } = useMemo(() => {
    const empty = {
      selectedSection: null as SectionInstance | null,
      selectedBlock: null as BlockInstance | null,
      selectedParentSection: null as SectionInstance | null,
      selectedColumn: null as BlockInstance | null,
      selectedColumnParentSection: null as SectionInstance | null,
      selectedParentColumn: null as BlockInstance | null,
      selectedParentRow: null as BlockInstance | null,
      selectedParentBlock: null as BlockInstance | null,
    };
    if (!state.selectedNodeId) return empty;

    // Check if it's a section
    const section = findSection(state.sections, state.selectedNodeId);
    if (section) {
      return { ...empty, selectedSection: section };
    }

    // Check if it's a column
    const colResult = findColumn(state.sections, state.selectedNodeId);
    if (colResult) {
      return { ...empty, selectedColumn: colResult.column, selectedColumnParentSection: colResult.section };
    }

    // Check if it's a block (including blocks inside columns and nested blocks)
    const blockResult = findBlock(state.sections, state.selectedNodeId);
    if (blockResult) {
      return {
        ...empty,
        selectedBlock: blockResult.block,
        selectedParentSection: blockResult.section,
        selectedParentColumn: blockResult.parentColumn ?? null,
        selectedParentRow: blockResult.parentRow ?? null,
        selectedParentBlock: blockResult.parentBlock ?? null,
      };
    }

    return empty;
  }, [state.sections, state.selectedNodeId]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      selectedSection,
      selectedBlock,
      selectedParentSection,
      selectedColumn,
      selectedColumnParentSection,
      selectedParentColumn,
      selectedParentRow,
      selectedParentBlock,
      vectorOverlay,
      openVectorOverlay,
      closeVectorOverlay,
    }),
    [
      state,
      dispatch,
      selectedSection,
      selectedBlock,
      selectedParentSection,
      selectedColumn,
      selectedColumnParentSection,
      selectedParentColumn,
      selectedParentRow,
      selectedParentBlock,
      vectorOverlay,
      openVectorOverlay,
      closeVectorOverlay,
    ]
  );

  return (
    <PageBuilderContext.Provider value={value}>
      {children}
    </PageBuilderContext.Provider>
  );
}

export function usePageBuilder(): PageBuilderContextValue {
  const ctx = useContext(PageBuilderContext);
  if (!ctx) {
    throw new Error('usePageBuilder must be used within PageBuilderProvider');
  }
  return ctx;
}
