/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useKangurAiTutorSelectionGuidanceHandoffEffect } from './KangurAiTutorWidget.guided';

describe('useKangurAiTutorSelectionGuidanceHandoffEffect', () => {
  it('clears the guided selection target once the selection panel is ready even for section-aware excerpts', async () => {
    const setGuidedTutorTargetMock = vi.fn();

    renderHook(() =>
      useKangurAiTutorSelectionGuidanceHandoffEffect({
        activeSelectedText: 'Ranking wynikow',
        hasSelectionPanelReady: true,
        isLoading: false,
        isOpen: true,
        panelMotionState: 'settled',
        selectionConversationSelectedText: 'Ranking wynikow',
        selectionGuidanceHandoffText: 'Ranking wynikow',
        setGuidedTutorTarget: setGuidedTutorTargetMock,
      })
    );

    await waitFor(() => expect(setGuidedTutorTargetMock).toHaveBeenCalledTimes(1));

    const updater = setGuidedTutorTargetMock.mock.calls[0]?.[0];
    expect(typeof updater).toBe('function');
    expect(
      updater({
        kind: 'selection_excerpt',
        mode: 'selection',
        selectedText: 'Ranking wynikow',
      })
    ).toBeNull();
    expect(
      updater({
        kind: 'selection_excerpt',
        mode: 'selection',
        selectedText: 'Inny fragment',
      })
    ).toEqual({
      kind: 'selection_excerpt',
      mode: 'selection',
      selectedText: 'Inny fragment',
    });
  });
});
