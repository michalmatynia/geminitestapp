'use client';

import React, { useReducer, useMemo, useState, useCallback, type ReactNode } from 'react';

import type {
  PageBuilderState,
  PageBuilderAction,
  InspectorSettings,
} from '@/shared/contracts/cms';
import { findSection, findBlock, findColumn } from './page-builder/block-helpers';
import { pageBuilderReducer } from './page-builder/page-builder-reducer';

export { pageBuilderReducer } from './page-builder/page-builder-reducer';

import { PageStateContext, usePageBuilderState } from './page-builder/PageStateContext';
import { PageDispatchContext, usePageBuilderDispatch } from './page-builder/PageDispatchContext';
import {
  PageSelectionContext,
  PageSelectionValue,
  usePageBuilderSelection,
} from './page-builder/PageSelectionContext';
import {
  VectorOverlayContext,
  VectorOverlayRequest,
  VectorOverlayValue,
  useVectorOverlay,
  VectorOverlayResult,
} from './page-builder/VectorOverlayContext';

export { usePageBuilderState, usePageBuilderDispatch, usePageBuilderSelection, useVectorOverlay };
export type { VectorOverlayResult, VectorOverlayRequest };

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

export interface PageBuilderContextValue extends PageSelectionValue, VectorOverlayValue {
  state: PageBuilderState;
  dispatch: React.Dispatch<PageBuilderAction>;
}

export function PageBuilderProvider({
  children,
  initialState: customInitialState = initialState,
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

  const selectionValue = useMemo((): PageSelectionValue => {
    const empty: PageSelectionValue = {
      selectedSection: null,
      selectedBlock: null,
      selectedParentSection: null,
      selectedColumn: null,
      selectedColumnParentSection: null,
      selectedParentColumn: null,
      selectedParentRow: null,
      selectedParentBlock: null,
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
      return {
        ...empty,
        selectedColumn: colResult.column,
        selectedColumnParentSection: colResult.section,
      };
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

  const vectorOverlayValue = useMemo(
    (): VectorOverlayValue => ({
      vectorOverlay,
      openVectorOverlay,
      closeVectorOverlay,
    }),
    [vectorOverlay, openVectorOverlay, closeVectorOverlay]
  );

  return (
    <PageStateContext.Provider value={state}>
      <PageDispatchContext.Provider value={dispatch}>
        <PageSelectionContext.Provider value={selectionValue}>
          <VectorOverlayContext.Provider value={vectorOverlayValue}>
            {children}
          </VectorOverlayContext.Provider>
        </PageSelectionContext.Provider>
      </PageDispatchContext.Provider>
    </PageStateContext.Provider>
  );
}

export function usePageBuilder(): PageBuilderContextValue {
  const state = usePageBuilderState();
  const dispatch = usePageBuilderDispatch();
  const selection = usePageBuilderSelection();
  const vectorOverlay = useVectorOverlay();

  return useMemo(
    () => ({
      state,
      dispatch,
      ...selection,
      ...vectorOverlay,
    }),
    [state, dispatch, selection, vectorOverlay]
  );
}
