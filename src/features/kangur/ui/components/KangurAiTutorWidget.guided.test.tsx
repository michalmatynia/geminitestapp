/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/shared/contracts/kangur-ai-tutor-content';

import {
  useKangurAiTutorGuidedFlow,
  useKangurAiTutorSelectionGuidanceHandoffEffect,
} from './KangurAiTutorWidget.guided';

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

describe('useKangurAiTutorGuidedFlow', () => {
  it('starts loading the selection explanation before the reveal timer finishes and only opens the shell after the slide delay', async () => {
    vi.useFakeTimers();

    const activateSelectionGlowMock = vi.fn(() => true);
    const clearSelectionMock = vi.fn();
    const handleOpenChatMock = vi.fn();
    const resetAskModalStateMock = vi.fn();
    const sendMessageMock = vi.fn(() => Promise.resolve());
    const setCanonicalTutorModalVisibleMock = vi.fn();
    const setContextualTutorModeMock = vi.fn();
    const setDismissedSelectedTextMock = vi.fn();
    const setGuestIntroHelpVisibleMock = vi.fn();
    const setGuestIntroVisibleMock = vi.fn();
    const setGuidedTutorTargetMock = vi.fn();
    const setHasNewMessageMock = vi.fn();
    const setHighlightedSectionMock = vi.fn();
    const setHighlightedTextMock = vi.fn();
    const setHoveredSectionAnchorIdMock = vi.fn();
    const setPersistedSelectionContainerRectMock = vi.fn();
    const setPersistedSelectionPageRectMock = vi.fn();
    const setPersistedSelectionPageRectsMock = vi.fn();
    const setPersistedSelectionRectMock = vi.fn();
    const setSelectionGuidanceCalloutVisibleTextMock = vi.fn();
    const setSelectionConversationContextMock = vi.fn();
    const setSelectionGuidanceHandoffTextMock = vi.fn();
    const setSectionResponseCompleteMock = vi.fn();
    const setSectionResponsePendingMock = vi.fn();
    const setSelectionContextSpotlightTickMock = vi.fn();
    const setSelectionResponseCompleteMock = vi.fn();
    const setSelectionResponsePendingMock = vi.fn();
    const setViewportTickMock = vi.fn();
    const selectionExplainTimeoutRef = { current: null as number | null };
    const selectionGuidanceRevealTimeoutRef = { current: null as number | null };
    const suppressAvatarClickRef = { current: false };

    const { result } = renderHook(() =>
      useKangurAiTutorGuidedFlow({
        activeSelectionPageRect: null,
        activateSelectionGlow: activateSelectionGlowMock,
        clearSelection: clearSelectionMock,
        handleOpenChat: handleOpenChatMock,
        messageCount: 4,
        motionProfile: {
          guidedAvatarTransition: {
            duration: 0.42,
          },
        },
        prefersReducedMotion: false,
        resetAskModalState: resetAskModalStateMock,
        selectionConversationFocus: {
          assignmentId: 'assignment-1',
          contentId: 'lesson-1',
          id: 'selection',
          kind: 'selection',
          knowledgeReference: null,
          label: '2 + 2',
          surface: 'lesson',
        },
        selectionExplainTimeoutRef,
        selectionGuidanceRevealTimeoutRef,
        sendMessage: sendMessageMock,
        setCanonicalTutorModalVisible: setCanonicalTutorModalVisibleMock,
        setContextualTutorMode: setContextualTutorModeMock,
        setDismissedSelectedText: setDismissedSelectedTextMock,
        setGuestIntroHelpVisible: setGuestIntroHelpVisibleMock,
        setGuestIntroVisible: setGuestIntroVisibleMock,
        setGuidedTutorTarget: setGuidedTutorTargetMock,
        setHasNewMessage: setHasNewMessageMock,
        setHighlightedSection: setHighlightedSectionMock,
        setHighlightedText: setHighlightedTextMock,
        setHoveredSectionAnchorId: setHoveredSectionAnchorIdMock,
        setPersistedSelectionContainerRect: setPersistedSelectionContainerRectMock,
        setPersistedSelectionPageRect: setPersistedSelectionPageRectMock,
        setPersistedSelectionPageRects: setPersistedSelectionPageRectsMock,
        setPersistedSelectionRect: setPersistedSelectionRectMock,
        setSelectionGuidanceCalloutVisibleText: setSelectionGuidanceCalloutVisibleTextMock,
        setSelectionConversationContext: setSelectionConversationContextMock,
        setSelectionGuidanceHandoffText: setSelectionGuidanceHandoffTextMock,
        setSectionResponseComplete: setSectionResponseCompleteMock,
        setSectionResponsePending: setSectionResponsePendingMock,
        setSelectionContextSpotlightTick: setSelectionContextSpotlightTickMock,
        setSelectionResponseComplete: setSelectionResponseCompleteMock,
        setSelectionResponsePending: setSelectionResponsePendingMock,
        setViewportTick: setViewportTickMock,
        suppressAvatarClickRef,
        telemetryContext: {
          contentId: 'lesson-1',
          surface: 'lesson',
          title: 'Dodawanie',
        },
        tutorContent: DEFAULT_KANGUR_AI_TUTOR_CONTENT,
        viewportHeight: 900,
      })
    );

    act(() => {
      result.current.startGuidedSelectionExplanation('2 + 2');
    });

    expect(sendMessageMock).toHaveBeenCalledWith(
      'Wyjaśnij zaznaczony fragment krok po kroku.',
      expect.objectContaining({
        promptMode: 'selected_text',
        selectedText: '2 + 2',
        focusKind: 'selection',
        focusId: 'selection',
        focusLabel: '2 + 2',
        assignmentId: 'assignment-1',
        interactionIntent: 'explain',
      })
    );
    expect(handleOpenChatMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(419);
    });

    expect(handleOpenChatMock).not.toHaveBeenCalled();
    expect(setSelectionGuidanceCalloutVisibleTextMock).not.toHaveBeenCalledWith('2 + 2');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(setSelectionGuidanceCalloutVisibleTextMock).toHaveBeenCalledWith('2 + 2');
    expect(setSelectionGuidanceHandoffTextMock).toHaveBeenCalledWith('2 + 2');
    expect(handleOpenChatMock).toHaveBeenCalledWith('selection_explain', {
      panelShellMode: 'minimal',
    });
    expect(sendMessageMock.mock.invocationCallOrder[0]).toBeLessThan(
      handleOpenChatMock.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY
    );
    expect(setGuidedTutorTargetMock).toHaveBeenCalledWith({
      kind: 'selection_excerpt',
      mode: 'selection',
      selectedText: '2 + 2',
    });

    vi.useRealTimers();
  });
});
