/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/shared/contracts/kangur-ai-tutor-content';

import {
  useKangurAiTutorGuidedFlow,
  useKangurAiTutorSelectionGuidanceDockOpenEffect,
  useKangurAiTutorSelectionGuidanceHandoffEffect,
} from './KangurAiTutorWidget.guided';

describe('useKangurAiTutorSelectionGuidanceDockOpenEffect', () => {
  it('opens the docked selection panel only after the final response is ready', async () => {
    const handleOpenChatMock = vi.fn();

    renderHook(() =>
      useKangurAiTutorSelectionGuidanceDockOpenEffect({
        activeSelectedText: 'Ranking wynikow',
        handleOpenChat: handleOpenChatMock,
        hasSelectionPanelReady: false,
        isLoading: false,
        selectionConversationSelectedText: 'Ranking wynikow',
        selectionGuidanceHandoffText: 'Ranking wynikow',
      })
    );

    await waitFor(() =>
      expect(handleOpenChatMock).toHaveBeenCalledWith('selection_explain', {
        panelShellMode: 'minimal',
      })
    );
  });

  it('moves an already-open tutor into the docked selection handoff when the panel is not ready', async () => {
    const handleOpenChatMock = vi.fn();

    renderHook(() =>
      useKangurAiTutorSelectionGuidanceDockOpenEffect({
        activeSelectedText: null,
        handleOpenChat: handleOpenChatMock,
        hasSelectionPanelReady: false,
        isLoading: false,
        selectionConversationSelectedText: 'Ranking wynikow',
        selectionGuidanceHandoffText: 'Ranking wynikow',
      })
    );

    await waitFor(() =>
      expect(handleOpenChatMock).toHaveBeenCalledWith('selection_explain', {
        panelShellMode: 'minimal',
      })
    );
  });

  it('still redocks the tutor when the live selected text reflows after capture', async () => {
    const handleOpenChatMock = vi.fn();

    renderHook(() =>
      useKangurAiTutorSelectionGuidanceDockOpenEffect({
        activeSelectedText: '🏗️ MISTRZOSTWO\n67%\n2/4 odznak',
        handleOpenChat: handleOpenChatMock,
        hasSelectionPanelReady: false,
        isLoading: false,
        selectionConversationSelectedText: '🏗️ MISTRZOSTWO 67% 2/4 odznak',
        selectionGuidanceHandoffText: '🏗️ MISTRZOSTWO 67% 2/4 odznak',
      })
    );

    await waitFor(() =>
      expect(handleOpenChatMock).toHaveBeenCalledWith('selection_explain', {
        panelShellMode: 'minimal',
      })
    );
  });

  it('does not reopen the tutor after the docked selection panel is already ready', async () => {
    const handleOpenChatMock = vi.fn();

    renderHook(() =>
      useKangurAiTutorSelectionGuidanceDockOpenEffect({
        activeSelectedText: 'Ranking wynikow',
        handleOpenChat: handleOpenChatMock,
        hasSelectionPanelReady: true,
        isLoading: false,
        selectionConversationSelectedText: 'Ranking wynikow',
        selectionGuidanceHandoffText: 'Ranking wynikow',
      })
    );

    await waitFor(() => {
      expect(handleOpenChatMock).not.toHaveBeenCalled();
    });
  });
});

describe('useKangurAiTutorSelectionGuidanceHandoffEffect', () => {
  it('finalizes the selection handoff once the docked panel is ready even for section-aware excerpts', async () => {
    const setContextualTutorModeMock = vi.fn();
    const setGuidedTutorTargetMock = vi.fn();
    const setSelectionGuidanceCalloutVisibleTextMock = vi.fn();
    const setSelectionGuidanceHandoffTextMock = vi.fn();
    const setSelectionResponseCompleteMock = vi.fn();
    const setSelectionResponsePendingMock = vi.fn();

    renderHook(() =>
      useKangurAiTutorSelectionGuidanceHandoffEffect({
        activeSelectedText: 'Ranking wynikow',
        hasSelectionPanelReady: true,
        isLoading: false,
        isOpen: true,
        panelMotionState: 'settled',
        selectionConversationSelectedText: 'Ranking wynikow',
        selectionGuidanceHandoffText: 'Ranking wynikow',
        setContextualTutorMode: setContextualTutorModeMock,
        setGuidedTutorTarget: setGuidedTutorTargetMock,
        setSelectionGuidanceCalloutVisibleText: setSelectionGuidanceCalloutVisibleTextMock,
        setSelectionGuidanceHandoffText: setSelectionGuidanceHandoffTextMock,
        setSelectionResponseComplete: setSelectionResponseCompleteMock,
        setSelectionResponsePending: setSelectionResponsePendingMock,
        telemetryContext: {
          contentId: 'game:home',
          surface: 'game',
          title: 'Ranking',
        },
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
    expect(setSelectionResponseCompleteMock).toHaveBeenCalledWith({
      selectedText: 'Ranking wynikow',
    });
    expect(setSelectionGuidanceCalloutVisibleTextMock).toHaveBeenCalledWith(null);
    expect(setSelectionGuidanceHandoffTextMock).toHaveBeenCalledWith(null);

    const contextualModeUpdater = setContextualTutorModeMock.mock.calls[0]?.[0];
    expect(typeof contextualModeUpdater).toBe('function');
    expect(contextualModeUpdater('selection_explain')).toBeNull();
    expect(contextualModeUpdater('section_explain')).toBe('section_explain');

    const pendingUpdater = setSelectionResponsePendingMock.mock.calls[0]?.[0];
    expect(typeof pendingUpdater).toBe('function');
    expect(pendingUpdater({ selectedText: 'Ranking wynikow' })).toBeNull();
    expect(pendingUpdater({ selectedText: 'Inny fragment' })).toEqual({
      selectedText: 'Inny fragment',
    });
  });

  it('finalizes the selection handoff when the live excerpt reflows but the stored selection is unchanged', async () => {
    const setContextualTutorModeMock = vi.fn();
    const setGuidedTutorTargetMock = vi.fn();
    const setSelectionGuidanceCalloutVisibleTextMock = vi.fn();
    const setSelectionGuidanceHandoffTextMock = vi.fn();
    const setSelectionResponseCompleteMock = vi.fn();
    const setSelectionResponsePendingMock = vi.fn();

    renderHook(() =>
      useKangurAiTutorSelectionGuidanceHandoffEffect({
        activeSelectedText: '🏗️ MISTRZOSTWO\n67%\n2/4 odznak',
        hasSelectionPanelReady: true,
        isLoading: false,
        isOpen: true,
        panelMotionState: 'settled',
        selectionConversationSelectedText: '🏗️ MISTRZOSTWO 67% 2/4 odznak',
        selectionGuidanceHandoffText: '🏗️ MISTRZOSTWO 67% 2/4 odznak',
        setContextualTutorMode: setContextualTutorModeMock,
        setGuidedTutorTarget: setGuidedTutorTargetMock,
        setSelectionGuidanceCalloutVisibleText: setSelectionGuidanceCalloutVisibleTextMock,
        setSelectionGuidanceHandoffText: setSelectionGuidanceHandoffTextMock,
        setSelectionResponseComplete: setSelectionResponseCompleteMock,
        setSelectionResponsePending: setSelectionResponsePendingMock,
        telemetryContext: {
          contentId: 'game:home',
          surface: 'game',
          title: 'Postęp gracza',
        },
      })
    );

    await waitFor(() =>
      expect(setSelectionResponseCompleteMock).toHaveBeenCalledWith({
        selectedText: '🏗️ MISTRZOSTWO 67% 2/4 odznak',
      })
    );
    expect(setGuidedTutorTargetMock).toHaveBeenCalledTimes(1);
  });
});

describe('useKangurAiTutorGuidedFlow', () => {
  it('starts loading the selection explanation before the reveal timer finishes and delays docking until the response-ready handoff', async () => {
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
    expect(setSelectionConversationContextMock).toHaveBeenCalledWith({
      focusLabel: '2 + 2',
      knowledgeReference: null,
      messageStartIndex: 4,
      selectedText: '2 + 2',
    });
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
    expect(handleOpenChatMock).not.toHaveBeenCalled();
    expect(setGuidedTutorTargetMock).toHaveBeenCalledWith({
      kind: 'selection_excerpt',
      mode: 'selection',
      selectedText: '2 + 2',
    });

    vi.useRealTimers();
  });

  it('passes the owning section knowledge reference when the selected excerpt belongs to a tutor anchor', () => {
    vi.useFakeTimers();

    const sendMessageMock = vi.fn(() => Promise.resolve());
    const setSelectionConversationContextMock = vi.fn();

    const { result } = renderHook(() =>
      useKangurAiTutorGuidedFlow({
        activeSelectionPageRect: null,
        activateSelectionGlow: vi.fn(() => true),
        clearSelection: vi.fn(),
        handleOpenChat: vi.fn(),
        messageCount: 2,
        motionProfile: {
          guidedAvatarTransition: {
            duration: 0.2,
          },
        },
        prefersReducedMotion: true,
        resetAskModalState: vi.fn(),
        selectionConversationFocus: {
          assignmentId: null,
          contentId: 'game:home',
          id: 'kangur-game-leaderboard',
          kind: 'leaderboard',
          knowledgeReference: {
            sourceCollection: 'kangur_page_content',
            sourceRecordId: 'game-home-leaderboard',
            sourcePath: 'entry:game-home-leaderboard',
          },
          label: 'Ranking',
          surface: 'game',
        },
        selectionExplainTimeoutRef: { current: null },
        selectionGuidanceRevealTimeoutRef: { current: null },
        sendMessage: sendMessageMock,
        setCanonicalTutorModalVisible: vi.fn(),
        setContextualTutorMode: vi.fn(),
        setDismissedSelectedText: vi.fn(),
        setGuestIntroHelpVisible: vi.fn(),
        setGuestIntroVisible: vi.fn(),
        setGuidedTutorTarget: vi.fn(),
        setHasNewMessage: vi.fn(),
        setHighlightedSection: vi.fn(),
        setHighlightedText: vi.fn(),
        setHoveredSectionAnchorId: vi.fn(),
        setPersistedSelectionContainerRect: vi.fn(),
        setPersistedSelectionPageRect: vi.fn(),
        setPersistedSelectionPageRects: vi.fn(),
        setPersistedSelectionRect: vi.fn(),
        setSelectionGuidanceCalloutVisibleText: vi.fn(),
        setSelectionConversationContext: setSelectionConversationContextMock,
        setSelectionGuidanceHandoffText: vi.fn(),
        setSectionResponseComplete: vi.fn(),
        setSectionResponsePending: vi.fn(),
        setSelectionContextSpotlightTick: vi.fn(),
        setSelectionResponseComplete: vi.fn(),
        setSelectionResponsePending: vi.fn(),
        setViewportTick: vi.fn(),
        suppressAvatarClickRef: { current: false },
        telemetryContext: {
          contentId: 'game:home',
          surface: 'game',
          title: 'Ranking',
        },
        tutorContent: DEFAULT_KANGUR_AI_TUTOR_CONTENT,
        viewportHeight: 900,
      })
    );

    act(() => {
      result.current.startGuidedSelectionExplanation('Ranking wynikow');
    });

    expect(sendMessageMock).toHaveBeenCalledWith(
      'Wyjaśnij zaznaczony fragment krok po kroku.',
      expect.objectContaining({
        promptMode: 'selected_text',
        selectedText: 'Ranking wynikow',
        contentId: 'game:home',
        focusKind: 'leaderboard',
        focusId: 'kangur-game-leaderboard',
        focusLabel: 'Ranking',
        knowledgeReference: {
          sourceCollection: 'kangur_page_content',
          sourceRecordId: 'game-home-leaderboard',
          sourcePath: 'entry:game-home-leaderboard',
        },
        interactionIntent: 'explain',
        surface: 'game',
      })
    );
    expect(setSelectionConversationContextMock).toHaveBeenCalledWith({
      focusLabel: 'Ranking',
      knowledgeReference: {
        sourceCollection: 'kangur_page_content',
        sourceRecordId: 'game-home-leaderboard',
        sourcePath: 'entry:game-home-leaderboard',
      },
      messageStartIndex: 2,
      selectedText: 'Ranking wynikow',
    });

    vi.useRealTimers();
  });
});
