'use client';

import { useCallback, useEffect, useState } from 'react';

export type KangurTextHighlightResult = {
  selectedText: string | null;
  clearSelection: () => void;
};

export function useKangurTextHighlight(): KangurTextHighlightResult {
  const [selectedText, setSelectedText] = useState<string | null>(null);

  useEffect(() => {
    const handleSelectionChange = (): void => {
      if (typeof window === 'undefined') return;
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? '';
      setSelectedText(text.length > 0 ? text : null);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const clearSelection = useCallback((): void => {
    if (typeof window !== 'undefined') {
      window.getSelection()?.removeAllRanges();
    }
    setSelectedText(null);
  }, []);

  return { selectedText, clearSelection };
}
