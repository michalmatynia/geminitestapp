'use client';

import React from 'react';

export type UseMarkdownSplitResizerProps = {
  splitRef: React.RefObject<HTMLDivElement | null>;
  editorWidth: number | null;
  onEditorWidthChange?:
    | ((next: number | null | ((prev: number | null) => number | null)) => void)
    | undefined;
  isDragging?: boolean | undefined;
  onDraggingChange?: ((dragging: boolean) => void) | undefined;
  showPreview?: boolean;
};

export function useMarkdownSplitResizer({
  splitRef,
  editorWidth,
  onEditorWidthChange,
  isDragging,
  onDraggingChange,
  showPreview = true,
}: UseMarkdownSplitResizerProps) {
  const [localIsDragging, setLocalIsDragging] = React.useState(false);
  const [localEditorWidth, setLocalEditorWidth] = React.useState<number | null>(null);

  const effectiveEditorWidth = onEditorWidthChange ? editorWidth : localEditorWidth;
  const effectiveIsDragging = onDraggingChange ? isDragging : localIsDragging;

  const updateEditorWidth = React.useCallback(
    (next: number | null | ((prev: number | null) => number | null)): void => {
      if (onEditorWidthChange) {
        onEditorWidthChange(next);
        return;
      }
      if (typeof next === 'function') {
        setLocalEditorWidth((prev) => next(prev));
        return;
      }
      setLocalEditorWidth(next);
    },
    [onEditorWidthChange]
  );

  const updateDragging = React.useCallback(
    (next: boolean): void => {
      if (onDraggingChange) {
        onDraggingChange(next);
        return;
      }
      setLocalIsDragging(next);
    },
    [onDraggingChange]
  );

  const handleMouseDown = React.useCallback(
    (event: React.MouseEvent): void => {
      event.preventDefault();
      updateDragging(true);
    },
    [updateDragging]
  );

  React.useEffect((): void => {
    if (!showPreview) return;
    const container = splitRef.current;
    if (!container) return;
    updateEditorWidth(
      (prev: number | null): number | null =>
        prev ?? Math.round(container.getBoundingClientRect().width / 2)
    );
  }, [splitRef, showPreview, updateEditorWidth]);

  React.useEffect((): void | (() => void) => {
    if (!effectiveIsDragging) return;
    const handlePointerMove = (event: PointerEvent): void => {
      const container = splitRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const minWidth = 260;
      const maxWidth = rect.width - 260;
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, event.clientX - rect.left));
      updateEditorWidth(nextWidth);
    };
    const handlePointerUp = (): void => {
      updateDragging(false);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return (): void => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [effectiveIsDragging, splitRef, updateDragging, updateEditorWidth]);

  return {
    editorWidth: effectiveEditorWidth,
    isDragging: effectiveIsDragging,
    updateDragging,
    updateEditorWidth,
    handleMouseDown,
  };
}
