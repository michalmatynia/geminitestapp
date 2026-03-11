'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';

export type KangurTextHighlightResult = {
  activateSelectionGlow: () => boolean;
  clearSelectionGlow: () => void;
  selectionGlowSupported: boolean;
  selectionLineRects: DOMRect[];
  selectedText: string | null;
  selectionRect: DOMRect | null;
  selectionContainerRect: DOMRect | null;
  clearSelection: () => void;
};

const TUTOR_SELECTION_GLOW_NAME = 'kangur-ai-tutor-selection-glow';

type HighlightRegistryLike = {
  delete: (name: string) => void;
  set: (name: string, highlight: unknown) => void;
};

type HighlightConstructorLike = new (...ranges: Range[]) => unknown;

const getHighlightRegistry = (): HighlightRegistryLike | null => {
  if (typeof CSS === 'undefined') {
    return null;
  }

  const cssWithHighlights = CSS as typeof CSS & {
    highlights?: HighlightRegistryLike;
  };

  return cssWithHighlights.highlights ?? null;
};

const getHighlightConstructor = (): HighlightConstructorLike | null => {
  const maybeHighlight = (globalThis as typeof globalThis & {
    Highlight?: HighlightConstructorLike;
  }).Highlight;

  return typeof maybeHighlight === 'function' ? maybeHighlight : null;
};

const isSelectionGlowSupported = (): boolean =>
  getHighlightRegistry() !== null && getHighlightConstructor() !== null;

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

const cloneDomRects = (rects: Iterable<DOMRect | DOMRectReadOnly>): DOMRect[] =>
  Array.from(rects)
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map((rect) => cloneDomRect(rect))
    .filter((rect): rect is DOMRect => rect !== null);

const clearBrowserSelection = (
  clearToken: number,
  latestClearTokenRef: MutableRefObject<number>
): void => {
  if (clearToken !== latestClearTokenRef.current || typeof window === 'undefined') {
    return;
  }

  const selection = window.getSelection() as (Selection & { empty?: () => void }) | null;
  if (!selection) {
    return;
  }

  try {
    selection.removeAllRanges();
  } catch {}

  if (typeof selection.empty === 'function') {
    try {
      selection.empty();
    } catch {}
  }

  if (selection.rangeCount > 0) {
    try {
      selection.removeAllRanges();
    } catch {}
  }
};

export function useKangurTextHighlight(): KangurTextHighlightResult {
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [selectionLineRects, setSelectionLineRects] = useState<DOMRect[]>([]);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [selectionContainerRect, setSelectionContainerRect] = useState<DOMRect | null>(null);
  const selectionRangeRef = useRef<Range | null>(null);
  const selectionClearTokenRef = useRef(0);

  const clearSelectionGlow = useCallback((): void => {
    getHighlightRegistry()?.delete(TUTOR_SELECTION_GLOW_NAME);
  }, []);

  const activateSelectionGlow = useCallback((): boolean => {
    const highlightRegistry = getHighlightRegistry();
    const HighlightConstructor = getHighlightConstructor();
    const selectionRange = selectionRangeRef.current;

    if (!highlightRegistry || !HighlightConstructor || !selectionRange) {
      return false;
    }

    const glowRange = selectionRange.cloneRange();
    highlightRegistry.set(TUTOR_SELECTION_GLOW_NAME, new HighlightConstructor(glowRange));
    return true;
  }, []);

  useEffect(() => {
    const resolveSelectionContainerRect = (range: Range | null): DOMRect | null => {
      if (!range || typeof document === 'undefined') {
        return null;
      }

      const commonAncestor =
        range.commonAncestorContainer instanceof Element
          ? range.commonAncestorContainer
          : range.commonAncestorContainer.parentElement;

      for (let current = commonAncestor; current; current = current.parentElement) {
        const testId = current.getAttribute('data-testid');
        const isLessonBlock = testId?.startsWith('lesson-') && testId.includes('-block-');
        const isQuestionCardShell = testId === 'question-card-shell';
        const isQuestionAnchor =
          testId === 'kangur-test-question-anchor' || testId === 'kangur-game-question-anchor';

        if (isLessonBlock || isQuestionCardShell || isQuestionAnchor) {
          return cloneDomRect(current.getBoundingClientRect());
        }
      }

      return null;
    };

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
      const lineRects =
        range && typeof range.getClientRects === 'function'
          ? cloneDomRects(range.getClientRects())
          : [];
      const containerRect = text.length > 0 ? resolveSelectionContainerRect(range) : null;
      if (text.length > 0 && range) {
        selectionClearTokenRef.current += 1;
        clearSelectionGlow();
      }
      selectionRangeRef.current = text.length > 0 && range ? range.cloneRange() : null;
      setSelectionLineRects(text.length > 0 ? lineRects : []);
      setSelectedText(text.length > 0 ? text : null);
      setSelectionRect(text.length > 0 ? rangeRect : null);
      setSelectionContainerRect(containerRect);
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
    const clearToken = selectionClearTokenRef.current + 1;
    selectionClearTokenRef.current = clearToken;
    clearBrowserSelection(clearToken, selectionClearTokenRef);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        clearBrowserSelection(clearToken, selectionClearTokenRef);
      }, 0);
      window.requestAnimationFrame(() => {
        clearBrowserSelection(clearToken, selectionClearTokenRef);
      });
    }
    selectionRangeRef.current = null;
    setSelectionLineRects([]);
    setSelectedText(null);
    setSelectionRect(null);
    setSelectionContainerRect(null);
  }, []);

  useEffect(() => () => {
    clearSelectionGlow();
  }, [clearSelectionGlow]);

  return {
    activateSelectionGlow,
    clearSelection,
    clearSelectionGlow,
    selectionGlowSupported: isSelectionGlowSupported(),
    selectionLineRects,
    selectedText,
    selectionRect,
    selectionContainerRect,
  };
}
