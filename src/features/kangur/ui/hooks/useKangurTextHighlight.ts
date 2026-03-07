'use client';

import { useCallback, useEffect, useState } from 'react';

export type KangurTextHighlightResult = {
  selectedText: string | null;
  selectionRect: DOMRect | null;
  clearSelection: () => void;
};

const cloneDomRect = (rect: DOMRect | DOMRectReadOnly | null): DOMRect | null => {
  if (!rect) {
    return null;
  }

  if (typeof DOMRect === 'function') {
    return new DOMRect(rect.x, rect.y, rect.width, rect.height);
  }

  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    toJSON: () => ({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
    }),
  } as DOMRect;
};

export function useKangurTextHighlight(): KangurTextHighlightResult {
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const handleSelectionChange = (): void => {
      if (typeof window === 'undefined') return;
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? '';
      const range =
        selection && selection.rangeCount > 0 && !selection.isCollapsed
          ? selection.getRangeAt(0)
          : null;
      const rangeRect =
        range && typeof range.getBoundingClientRect === 'function'
          ? cloneDomRect(range.getBoundingClientRect())
          : null;
      setSelectedText(text.length > 0 ? text : null);
      setSelectionRect(text.length > 0 ? rangeRect : null);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    window.addEventListener('resize', handleSelectionChange);
    window.addEventListener('scroll', handleSelectionChange, true);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      window.removeEventListener('resize', handleSelectionChange);
      window.removeEventListener('scroll', handleSelectionChange, true);
    };
  }, []);

  const clearSelection = useCallback((): void => {
    if (typeof window !== 'undefined') {
      window.getSelection()?.removeAllRanges();
    }
    setSelectedText(null);
    setSelectionRect(null);
  }, []);

  return { selectedText, selectionRect, clearSelection };
}
