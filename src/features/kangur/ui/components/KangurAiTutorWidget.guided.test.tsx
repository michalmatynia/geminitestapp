/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';

import { useKangurAiTutorGuidedFlow } from './KangurAiTutorWidget.guided';

describe('useKangurAiTutorGuidedFlow', () => {
  it('starts loading the selection explanation without revealing the guided modal before the answer thread resolves', async () => {
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
      await vi.runAllTimersAsync();
    });

    expect(handleOpenChatMock).not.toHaveBeenCalled();
    expect(setSelectionGuidanceCalloutVisibleTextMock).toHaveBeenCalledWith('2 + 2');
    expect(setSelectionGuidanceHandoffTextMock).not.toHaveBeenCalledWith('2 + 2');
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
      result.current.startGuidedSelectionExplanation('Ranking wyników');
    });

    expect(sendMessageMock).toHaveBeenCalledWith(
      'Wyjaśnij zaznaczony fragment krok po kroku.',
      expect.objectContaining({
        promptMode: 'selected_text',
        selectedText: 'Ranking wyników',
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
      selectedText: 'Ranking wyników',
    });

    vi.useRealTimers();
  });
});
