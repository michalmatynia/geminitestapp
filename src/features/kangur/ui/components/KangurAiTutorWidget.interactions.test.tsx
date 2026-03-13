/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { trackKangurClientEventMock } = vi.hoisted(() => ({
  trackKangurClientEventMock: vi.fn(),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: trackKangurClientEventMock,
}));

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
});
