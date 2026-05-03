/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const {
  trackKangurClientEventMock,
  withKangurClientError,
  withKangurClientErrorSync,
} = vi.hoisted(() => globalThis.__kangurClientErrorMocks());

vi.mock('@/features/kangur/observability/client', () => {
  const mocks = globalThis.__kangurClientErrorMocks();
  return {
    trackKangurClientEvent: mocks.trackKangurClientEventMock,
    withKangurClientError: mocks.withKangurClientError,
    withKangurClientErrorSync: mocks.withKangurClientErrorSync,
  };
,
  isRecoverableKangurClientFetchError: vi.fn().mockReturnValue(false),});

vi.mock('./KangurAiTutorWidget.storage', () => ({
  clearPersistedTutorAvatarPosition: vi.fn(),
  clearPersistedTutorPanelPosition: vi.fn(),
  persistTutorPanelPosition: vi.fn(),
  persistTutorVisibilityHidden: vi.fn(),
}));

import { useKangurAiTutorPanelInteractions } from './KangurAiTutorWidget.interactions';

describe('useKangurAiTutorPanelInteractions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears excerpt takeover state when a section-aware selected-text tutor is closed from the header', () => {
    const clearSelectionMock = vi.fn();
    const closeChatMock = vi.fn();
    const setHighlightedTextMock = vi.fn();

    const widgetState = {
      askModalReturnStateRef: { current: null },
      avatarDragStateRef: { current: null },
      selectionExplainTimeoutRef: { current: null },
      selectionGuidanceRevealTimeoutRef: { current: null },
      setAskModalDockStyle: vi.fn(),
      setAskModalVisible: vi.fn(),
      setCanonicalTutorModalVisible: vi.fn(),
      setContextualTutorMode: vi.fn(),
      setDismissedSelectedText: vi.fn(),
      setDraggedAvatarPoint: vi.fn(),
      setGuestAuthFormVisible: vi.fn(),
      setGuestIntroHelpVisible: vi.fn(),
      setGuestIntroVisible: vi.fn(),
      setGuidedTutorTarget: vi.fn(),
      setHasNewMessage: vi.fn(),
      setHighlightedSection: vi.fn(),
      setHomeOnboardingStepIndex: vi.fn(),
      setHoveredSectionAnchorId: vi.fn(),
      setIsAvatarDragging: vi.fn(),
      setLauncherPromptVisible: vi.fn(),
      panelPosition: null,
      panelSnapPreference: 'free' as const,
      setPanelAnchorMode: vi.fn(),
      setPanelPosition: vi.fn(),
      setPanelPositionMode: vi.fn(),
      setPanelSnapPreference: vi.fn(),
      setPanelShellMode: vi.fn(),
      setPersistedSelectionContainerRect: vi.fn(),
      setPersistedSelectionPageRect: vi.fn(),
      setPersistedSelectionPageRects: vi.fn(),
      setPersistedSelectionRect: vi.fn(),
      setSelectionGuidanceCalloutVisibleText: vi.fn(),
      setSelectionConversationContext: vi.fn(),
      setSelectionGuidanceHandoffText: vi.fn(),
      setSectionResponseComplete: vi.fn(),
      setSectionResponsePending: vi.fn(),
      setSelectionResponseComplete: vi.fn(),
      setSelectionResponsePending: vi.fn(),
      suppressAvatarClickRef: { current: false },
    };

    const { result } = renderHook(() =>
      useKangurAiTutorPanelInteractions({
        activeConversationFocus: {
          assignmentId: null,
          contentId: 'lesson-1',
          id: 'kangur-lesson-selection',
          kind: 'selection',
          knowledgeReference: null,
          label: '2 + 2',
          surface: 'lesson',
        },
        activeSelectedText: '2 + 2',
        allowSelectedTextSupport: true,
        bubblePlacementMode: 'bubble',
        clearSelection: clearSelectionMock,
        closeChat: closeChatMock,
        freeformContextualPanelPoint: null,
        isAskModalMode: false,
        isOpen: true,
        isTargetWithinTutorUi: () => false,
        messageCount: 3,
        openChat: vi.fn(),
        persistSelectionGeometry: vi.fn(),
        selectedText: '2 + 2',
        selectionRect: new DOMRect(120, 180, 140, 26),
        setHighlightedText: setHighlightedTextMock,
        setInputValue: vi.fn(),
        telemetryContext: {
          contentId: 'lesson-1',
          surface: 'lesson',
          title: 'Dodawanie',
        },
        widgetState,
      })
    );

    act(() => {
      result.current.handleCloseChat('header');
    });

    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_closed',
      expect.objectContaining({
        reason: 'header',
        surface: 'lesson',
        title: 'Dodawanie',
      })
    );
    expect(widgetState.setGuidedTutorTarget).toHaveBeenCalledWith(null);
    expect(widgetState.setHighlightedSection).toHaveBeenCalledWith(null);
    expect(widgetState.setSelectionConversationContext).toHaveBeenCalledWith(null);
    expect(widgetState.setSelectionGuidanceCalloutVisibleText).toHaveBeenCalledWith(null);
    expect(widgetState.setSelectionGuidanceHandoffText).toHaveBeenCalledWith(null);
    expect(widgetState.setSelectionResponsePending).toHaveBeenCalledWith(null);
    expect(widgetState.setSelectionResponseComplete).toHaveBeenCalledWith(null);
    expect(widgetState.setSectionResponsePending).toHaveBeenCalledWith(null);
    expect(widgetState.setSectionResponseComplete).toHaveBeenCalledWith(null);
    expect(clearSelectionMock).toHaveBeenCalledTimes(1);
    expect(setHighlightedTextMock).toHaveBeenCalledWith(null);
    expect(widgetState.setPersistedSelectionRect).toHaveBeenCalledWith(null);
    expect(widgetState.setPersistedSelectionPageRect).toHaveBeenCalledWith(null);
    expect(widgetState.setPersistedSelectionPageRects).toHaveBeenCalledWith([]);
    expect(widgetState.setPersistedSelectionContainerRect).toHaveBeenCalledWith(null);
    expect(widgetState.setContextualTutorMode).toHaveBeenCalledWith(null);
    expect(widgetState.setPanelShellMode).toHaveBeenCalledWith('default');
    expect(closeChatMock).toHaveBeenCalledTimes(1);
  });

  it('persists the current selection focus metadata when Zapytaj o to captures a selection thread', () => {
    const widgetState = {
      askModalReturnStateRef: { current: null },
      avatarDragStateRef: { current: null },
      selectionExplainTimeoutRef: { current: null },
      selectionGuidanceRevealTimeoutRef: { current: null },
      setAskModalDockStyle: vi.fn(),
      setAskModalVisible: vi.fn(),
      setCanonicalTutorModalVisible: vi.fn(),
      setContextualTutorMode: vi.fn(),
      setDismissedSelectedText: vi.fn(),
      setDraggedAvatarPoint: vi.fn(),
      setGuestAuthFormVisible: vi.fn(),
      setGuestIntroHelpVisible: vi.fn(),
      setGuestIntroVisible: vi.fn(),
      setGuidedTutorTarget: vi.fn(),
      setHasNewMessage: vi.fn(),
      setHighlightedSection: vi.fn(),
      setHomeOnboardingStepIndex: vi.fn(),
      setHoveredSectionAnchorId: vi.fn(),
      setIsAvatarDragging: vi.fn(),
      setLauncherPromptVisible: vi.fn(),
      panelPosition: null,
      panelSnapPreference: 'free' as const,
      setPanelAnchorMode: vi.fn(),
      setPanelPosition: vi.fn(),
      setPanelPositionMode: vi.fn(),
      setPanelSnapPreference: vi.fn(),
      setPanelShellMode: vi.fn(),
      setPersistedSelectionContainerRect: vi.fn(),
      setPersistedSelectionPageRect: vi.fn(),
      setPersistedSelectionPageRects: vi.fn(),
      setPersistedSelectionRect: vi.fn(),
      setSelectionGuidanceCalloutVisibleText: vi.fn(),
      setSelectionConversationContext: vi.fn(),
      setSelectionGuidanceHandoffText: vi.fn(),
      setSectionResponseComplete: vi.fn(),
      setSectionResponsePending: vi.fn(),
      setSelectionResponseComplete: vi.fn(),
      setSelectionResponsePending: vi.fn(),
      suppressAvatarClickRef: { current: false },
    };
    const persistSelectionGeometryMock = vi.fn();

    const { result } = renderHook(() =>
      useKangurAiTutorPanelInteractions({
        activeConversationFocus: {
          assignmentId: null,
          contentId: 'suite-add-1',
          id: 'kangur-test-question:suite-add-1:question-1',
          kind: 'question',
          knowledgeReference: {
            sourceCollection: 'kangur_page_content',
            sourceRecordId: 'tests-question',
            sourcePath: 'entry:tests-question',
          },
          label: 'Pytanie 1/1',
          surface: 'test',
        },
        activeSelectedText: 'Który kwadrat został rozcięty?',
        allowSelectedTextSupport: true,
        bubblePlacementMode: 'bubble',
        clearSelection: vi.fn(),
        closeChat: vi.fn(),
        freeformContextualPanelPoint: null,
        isAskModalMode: false,
        isOpen: false,
        isTargetWithinTutorUi: () => false,
        messageCount: 7,
        openChat: vi.fn(),
        persistSelectionGeometry: persistSelectionGeometryMock,
        selectedText: 'Który kwadrat został rozcięty?',
        selectionRect: new DOMRect(120, 180, 240, 36),
        setHighlightedText: vi.fn(),
        setInputValue: vi.fn(),
        telemetryContext: {
          contentId: 'suite-add-1',
          surface: 'test',
          title: 'Mini test',
        },
        widgetState,
      })
    );

    act(() => {
      expect(result.current.persistSelectionContext()).toBe(
        'Który kwadrat został rozcięty?'
      );
    });

    expect(widgetState.setSelectionConversationContext).toHaveBeenCalledWith({
      assignmentId: null,
      contentId: 'suite-add-1',
      focusId: 'kangur-test-question:suite-add-1:question-1',
      focusKind: 'question',
      focusLabel: 'Pytanie 1/1',
      knowledgeReference: {
        sourceCollection: 'kangur_page_content',
        sourceRecordId: 'tests-question',
        sourcePath: 'entry:tests-question',
      },
      messageStartIndex: 7,
      selectedText: 'Który kwadrat został rozcięty?',
      surface: 'test',
    });
    expect(persistSelectionGeometryMock).toHaveBeenCalledTimes(1);
  });
});
