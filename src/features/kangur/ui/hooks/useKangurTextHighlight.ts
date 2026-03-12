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
const TUTOR_SELECTION_EMPHASIS_ATTRIBUTE = 'data-kangur-ai-tutor-selection-emphasis';
const TUTOR_SELECTION_EMPHASIS_VALUE = 'gradient';
const TUTOR_SELECTION_EMPHASIS_CLASSNAME = 'kangur-ai-tutor-selection-gradient';

type HighlightRegistryLike = {
  delete: (name: string) => void;
  set: (name: string, highlight: unknown) => void;
};

const getHighlightRegistry = (): HighlightRegistryLike | null => {
  if (typeof CSS === 'undefined') {
    return null;
  }

  const cssWithHighlights = CSS as typeof CSS & {
    highlights?: HighlightRegistryLike;
  };

  return cssWithHighlights.highlights ?? null;
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

const rangeIntersectsTextNode = (range: Range, node: Text): boolean => {
  if (typeof range.intersectsNode === 'function') {
    try {
      return range.intersectsNode(node);
    } catch {}
  }

  const nodeRange = document.createRange();
  nodeRange.selectNodeContents(node);

  return (
    range.compareBoundaryPoints(Range.END_TO_START, nodeRange) > 0 &&
    range.compareBoundaryPoints(Range.START_TO_END, nodeRange) < 0
  );
};

const collectIntersectingTextNodes = (range: Range): Text[] => {
  const root = range.commonAncestorContainer;

  if (root.nodeType === Node.TEXT_NODE) {
    return rangeIntersectsTextNode(range, root as Text) ? [root as Text] : [];
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) =>
        node.textContent && rangeIntersectsTextNode(range, node as Text)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
    }
  );
  const textNodes: Text[] = [];
  let current = walker.nextNode();

  while (current) {
    textNodes.push(current as Text);
    current = walker.nextNode();
  }

  return textNodes;
};

const isolateTextNodeSegment = (
  node: Text,
  startOffset: number,
  endOffset: number
): Text | null => {
  if (startOffset >= endOffset || endOffset <= 0 || startOffset >= node.data.length) {
    return null;
  }

  let targetNode = node;
  const clampedEndOffset = Math.min(endOffset, targetNode.data.length);

  if (clampedEndOffset < targetNode.data.length) {
    targetNode.splitText(clampedEndOffset);
  }

  if (startOffset > 0) {
    targetNode = targetNode.splitText(startOffset);
  }

  return targetNode.data.length > 0 ? targetNode : null;
};

const applySelectionTextEmphasis = (range: Range): HTMLElement[] => {
  const textNodes = collectIntersectingTextNodes(range);
  const wrappers: HTMLElement[] = [];

  for (const textNode of textNodes) {
    const startOffset =
      textNode === range.startContainer && range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startOffset
        : 0;
    const endOffset =
      textNode === range.endContainer && range.endContainer.nodeType === Node.TEXT_NODE
        ? range.endOffset
        : textNode.data.length;
    const emphasizedNode = isolateTextNodeSegment(textNode, startOffset, endOffset);

    if (!emphasizedNode || !emphasizedNode.parentNode) {
      continue;
    }

    const wrapper = document.createElement('span');
    wrapper.setAttribute(TUTOR_SELECTION_EMPHASIS_ATTRIBUTE, TUTOR_SELECTION_EMPHASIS_VALUE);
    wrapper.className = TUTOR_SELECTION_EMPHASIS_CLASSNAME;
    emphasizedNode.parentNode.insertBefore(wrapper, emphasizedNode);
    wrapper.appendChild(emphasizedNode);
    wrappers.push(wrapper);
  }

  return wrappers;
};

const clearSelectionTextEmphasis = (wrappers: HTMLElement[]): void => {
  const parentsToNormalize = new Set<Node>();

  for (const wrapper of wrappers) {
    if (!wrapper.isConnected || !wrapper.parentNode) {
      continue;
    }

    const parent = wrapper.parentNode;
    parentsToNormalize.add(parent);
    while (wrapper.firstChild) {
      parent.insertBefore(wrapper.firstChild, wrapper);
    }
    parent.removeChild(wrapper);
  }

  parentsToNormalize.forEach((parent) => {
    if ('normalize' in parent && typeof parent.normalize === 'function') {
      parent.normalize();
    }
  });
};

export function useKangurTextHighlight(): KangurTextHighlightResult {
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [selectionLineRects, setSelectionLineRects] = useState<DOMRect[]>([]);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [selectionContainerRect, setSelectionContainerRect] = useState<DOMRect | null>(null);
  const selectionRangeRef = useRef<Range | null>(null);
  const selectionClearTokenRef = useRef(0);
  const selectionEmphasisWrappersRef = useRef<HTMLElement[]>([]);

  const clearSelectionGlow = useCallback((): void => {
    getHighlightRegistry()?.delete(TUTOR_SELECTION_GLOW_NAME);
    clearSelectionTextEmphasis(selectionEmphasisWrappersRef.current);
    selectionEmphasisWrappersRef.current = [];
  }, []);

  const activateSelectionGlow = useCallback((): boolean => {
    const selectionRange = selectionRangeRef.current;

    if (!selectionRange) {
      return false;
    }

    clearSelectionGlow();
    selectionEmphasisWrappersRef.current = applySelectionTextEmphasis(selectionRange.cloneRange());
    return selectionEmphasisWrappersRef.current.length > 0;
  }, [clearSelectionGlow]);

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
  }, [clearSelectionGlow]);

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
    selectionGlowSupported: typeof document !== 'undefined',
    selectionLineRects,
    selectedText,
    selectionRect,
    selectionContainerRect,
  };
}
