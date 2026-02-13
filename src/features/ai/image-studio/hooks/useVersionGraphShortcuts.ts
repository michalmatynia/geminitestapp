import React, { useCallback } from 'react';

import type { VersionNode } from '../context/VersionGraphContext';

// ── Types ────────────────────────────────────────────────────────────────────

export interface UseVersionGraphShortcutsParams {
  mergeMode: boolean;
  compositeMode: boolean;
  compareMode: boolean;
  isolatedNodeId: string | null;
  selectedNodeId: string | null;
  nodes: VersionNode[];
  toggleMergeMode: () => void;
  toggleCompositeMode: () => void;
  toggleCompareMode: () => void;
  isolateBranch: (id: string | null) => void;
  selectNode: (id: string | null) => void;
  setAnnotation: (id: string, text: string) => Promise<void>;
  setAnnotationDraft: (text: string) => void;
  fitToView: () => void;
  focusNode: (id: string) => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useVersionGraphShortcuts({
  mergeMode,
  compositeMode,
  compareMode,
  isolatedNodeId,
  selectedNodeId,
  nodes,
  toggleMergeMode,
  toggleCompositeMode,
  toggleCompareMode,
  isolateBranch,
  selectNode,
  setAnnotation,
  setAnnotationDraft,
  fitToView,
  focusNode,
}: UseVersionGraphShortcutsParams): React.KeyboardEventHandler {
  return useCallback((e: React.KeyboardEvent) => {
    // Don't capture when typing in inputs
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    switch (e.key) {
      case 'Escape':
        if (mergeMode) { toggleMergeMode(); }
        else if (compositeMode) { toggleCompositeMode(); }
        else if (compareMode) { toggleCompareMode(); }
        else if (isolatedNodeId) { isolateBranch(null); }
        else if (selectedNodeId) { selectNode(null); }
        break;
      case 'f':
        fitToView();
        break;
      case 'Delete':
      case 'Backspace':
        if (selectedNodeId) {
          void setAnnotation(selectedNodeId, '');
          setAnnotationDraft('');
        }
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight': {
        e.preventDefault();
        if (!selectedNodeId) {
          if (nodes.length > 0) selectNode(nodes[0]!.id);
          break;
        }
        const current = nodes.find((n) => n.id === selectedNodeId);
        if (!current) break;
        if ((e.key === 'ArrowUp' || e.key === 'ArrowLeft') && current.parentIds.length > 0) {
          selectNode(current.parentIds[0]!);
        } else if ((e.key === 'ArrowDown' || e.key === 'ArrowRight') && current.childIds.length > 0) {
          selectNode(current.childIds[0]!);
        }
        break;
      }
      case 'Enter':
        if (selectedNodeId) {
          focusNode(selectedNodeId);
        }
        break;
    }
  }, [mergeMode, compositeMode, compareMode, isolatedNodeId, selectedNodeId, nodes,
    toggleMergeMode, toggleCompositeMode, toggleCompareMode, isolateBranch, selectNode,
    setAnnotation, setAnnotationDraft, fitToView, focusNode]);
}
