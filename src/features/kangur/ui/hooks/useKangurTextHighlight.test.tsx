/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useKangurTextHighlight } from './useKangurTextHighlight';

describe('useKangurTextHighlight', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('prefers the game question card shell as the protected selection container', async () => {
    const questionAnchor = document.createElement('div');
    questionAnchor.dataset.testid = 'kangur-game-question-anchor';
    questionAnchor.getBoundingClientRect = () => new DOMRect(416, 284, 864, 144);

    const questionCardShell = document.createElement('div');
    questionCardShell.dataset.testid = 'question-card-shell';
    questionCardShell.getBoundingClientRect = () => new DOMRect(416, 284, 448, 144);

    const questionHeading = document.createElement('h3');
    questionHeading.textContent = '50 ÷ 5 = ?';

    questionCardShell.appendChild(questionHeading);
    questionAnchor.appendChild(questionCardShell);
    document.body.appendChild(questionAnchor);

    const selectedNode = questionHeading.firstChild;
    expect(selectedNode).not.toBeNull();

    const rangeRect = new DOMRect(528, 312, 222, 60);
    const mockRange = {
      commonAncestorContainer: selectedNode,
      getBoundingClientRect: () => rangeRect,
    } as unknown as Range;
    const mockSelection = {
      toString: () => '50 ÷ 5 = ?',
      rangeCount: 1,
      isCollapsed: false,
      getRangeAt: () => mockRange,
      removeAllRanges: vi.fn(),
    } as unknown as Selection;

    vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection);

    const { result } = renderHook(() => useKangurTextHighlight());

    act(() => {
      document.dispatchEvent(new Event('selectionchange'));
    });

    await waitFor(() => {
      expect(result.current.selectedText).toBe('50 ÷ 5 = ?');
      expect(result.current.selectionRect?.left).toBe(rangeRect.left);
      expect(result.current.selectionContainerRect?.left).toBe(416);
      expect(result.current.selectionContainerRect?.top).toBe(284);
      expect(result.current.selectionContainerRect?.width).toBe(448);
      expect(result.current.selectionContainerRect?.height).toBe(144);
    });
  });
});
