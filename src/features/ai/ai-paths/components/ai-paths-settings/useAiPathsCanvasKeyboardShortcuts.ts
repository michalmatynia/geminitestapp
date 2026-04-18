'use client';

import { useEffect } from 'react';
import { isEditableElement } from './utils/canvas-interaction-utils';

interface KeyboardShortcutsOptions {
  enabled: boolean;
  selectedNodeIds: string[];
  selectedEdgeId: string | null;
  handleDeleteSelectedNode: () => void;
}

export function useAiPathsCanvasKeyboardShortcuts(options: KeyboardShortcutsOptions): void {
  const { enabled, selectedNodeIds, selectedEdgeId, handleDeleteSelectedNode } = options;

  useEffect(() => {
    if (!enabled) return (): void => {};
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.repeat) return;
      if (!['Delete', 'Backspace'].includes(event.key)) return;
      if (isEditableElement(event.target)) return;
      
      const hasNodeSelection = selectedNodeIds.length > 0;
      const hasEdgeSelection = selectedEdgeId !== null && selectedEdgeId !== '';
      
      if (hasNodeSelection || hasEdgeSelection) {
        event.preventDefault();
        handleDeleteSelectedNode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return (): void => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleDeleteSelectedNode, selectedEdgeId, selectedNodeIds]);
}
