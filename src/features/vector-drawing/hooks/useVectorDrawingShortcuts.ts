'use client';

import { useEffect, useRef } from 'react';
import type { VectorToolMode } from '../types';

export type VectorDrawingShortcutsProps = {
  onUndo: () => void;
  onRedo: () => void;
  onToolChange: (tool: VectorToolMode) => void;
};

export function useVectorDrawingShortcuts({
  onUndo,
  onRedo,
  onToolChange,
}: VectorDrawingShortcutsProps): void {
  const onUndoRef = useRef(onUndo);
  onUndoRef.current = onUndo;
  const onRedoRef = useRef(onRedo);
  onRedoRef.current = onRedo;
  const onToolChangeRef = useRef(onToolChange);
  onToolChangeRef.current = onToolChange;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      // Skip if user is typing in an input/textarea/contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        onUndoRef.current();
        return;
      }
      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y / Cmd+Y
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        onRedoRef.current();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        onRedoRef.current();
        return;
      }

      // Tool shortcuts (only when no modifier keys)
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const toolMap: Record<string, VectorToolMode> = {
        v: 'select', '1': 'select',
        p: 'polygon', '2': 'polygon',
        l: 'lasso', '3': 'lasso',
        r: 'rect', '4': 'rect',
        e: 'ellipse', '5': 'ellipse',
        b: 'brush', '6': 'brush',
      };
      const mappedTool = toolMap[e.key.toLowerCase()];
      if (mappedTool) {
        e.preventDefault();
        onToolChangeRef.current(mappedTool);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return (): void => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
