'use client';

import { useCallback, useEffect, type MouseEvent as ReactMouseEvent } from 'react';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';

import {
  clearPersistedTutorAvatarPosition,
  clearPersistedTutorPanelPosition,
  persistTutorPanelPosition,
  persistTutorVisibilityHidden,
} from './KangurAiTutorWidget.storage';

import type { KangurAiTutorWidgetState } from './KangurAiTutorWidget.state';
import type { TutorPanelShellMode } from './KangurAiTutorWidget.types';

type TelemetryContext = {
  contentId: string | null;
  surface: string | null;
  title: string | null;
};

type UseKangurAiTutorPanelInteractionsInput = {
  activeSelectedText: string | null;
  allowSelectedTextSupport: boolean;
  bubblePlacementMode: string;
  clearSelection: () => void;
  closeChat: () => void;
  freeformContextualPanelPoint: { x: number; y: number } | null;
  isAskModalMode: boolean;
  isOpen: boolean;
  isTargetWithinTutorUi: (target: EventTarget | null) => boolean;
  messageCount: number;
  openChat: () => void;
  persistSelectionGeometry: () => void;
  selectedText: string | null;
  selectionRect: DOMRect | null;
  setHighlightedText: (value: string | null) => void;
  setInputValue: (value: string) => void;
  telemetryContext: TelemetryContext;
  widgetState: Pick<
    KangurAiTutorWidgetState,
    | 'askModalReturnStateRef'
    | 'avatarDragStateRef'
    | 'selectionExplainTimeoutRef'
    | 'selectionGuidanceRevealTimeoutRef'
    | 'setAskModalDockStyle'
    | 'setAskModalVisible'
    | 'setCanonicalTutorModalVisible'
    | 'setContextualTutorMode'
    | 'setDismissedSelectedText'
    | 'setDraggedAvatarPoint'
    | 'setGuestAuthFormVisible'
    | 'setGuestIntroHelpVisible'
    | 'setGuestIntroVisible'
    | 'setGuidedTutorTarget'
    | 'setHasNewMessage'
    | 'setHighlightedSection'
    | 'setHomeOnboardingStepIndex'
    | 'setHoveredSectionAnchorId'
    | 'setIsAvatarDragging'
    | 'setLauncherPromptVisible'
    | 'panelPosition'
    | 'panelSnapPreference'
    | 'setPanelAnchorMode'
    | 'setPanelMotionState'
    | 'setPanelPosition'
    | 'setPanelPositionMode'
    | 'setPanelSnapPreference'
    | 'setPanelShellMode'
    | 'setPersistedSelectionContainerRect'
    | 'setPersistedSelectionPageRect'
    | 'setPersistedSelectionPageRects'
    | 'setPersistedSelectionRect'
    | 'setSelectionGuidanceCalloutVisibleText'
    | 'setSelectionConversationContext'
    | 'setSelectionGuidanceHandoffText'
    | 'setSectionResponseComplete'
    | 'setSectionResponsePending'
    | 'setSelectionResponseComplete'
    | 'setSelectionResponsePending'
    | 'suppressAvatarClickRef'
  >;
};

export function useKangurAiTutorPanelInteractions({
  activeSelectedText,
  allowSelectedTextSupport,
  bubblePlacementMode,
  clearSelection,
  closeChat,
  freeformContextualPanelPoint,
  isAskModalMode,
  isOpen,
  isTargetWithinTutorUi,
  messageCount,
  openChat,
  persistSelectionGeometry,
  selectedText,
  selectionRect,
  setHighlightedText,
  setInputValue,
  telemetryContext,
  widgetState,
}: UseKangurAiTutorPanelInteractionsInput) {
  const {
    askModalReturnStateRef,
    avatarDragStateRef,
    selectionExplainTimeoutRef,
    selectionGuidanceRevealTimeoutRef,
    setAskModalDockStyle,
    setAskModalVisible,
    setCanonicalTutorModalVisible,
    setContextualTutorMode,
    setDismissedSelectedText,
    setDraggedAvatarPoint,
    setGuestAuthFormVisible,
    setGuestIntroHelpVisible,
    setGuestIntroVisible,
    setGuidedTutorTarget,
    setHasNewMessage,
    setHighlightedSection,
    setHomeOnboardingStepIndex,
    setHoveredSectionAnchorId,
    setIsAvatarDragging,
    setLauncherPromptVisible,
    panelPosition,
    panelSnapPreference,
    setPanelAnchorMode,
    setPanelMotionState,
    setPanelPosition,
    setPanelPositionMode,
    setPanelSnapPreference,
    setPanelShellMode,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionPageRects,
    setPersistedSelectionRect,
    setSelectionGuidanceCalloutVisibleText,
    setSelectionConversationContext,
    setSelectionGuidanceHandoffText,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    suppressAvatarClickRef,
  } = widgetState;

  const persistSelectionContext = useCallback(
    (options?: { prefillInput?: boolean }): string | null => {
      if (!allowSelectedTextSupport) {
        return null;
      }

      const trimmedSelectedText = selectedText?.trim() || null;
      if (!trimmedSelectedText) {
        return null;
      }

      if (options?.prefillInput) {
        setInputValue(`"${trimmedSelectedText}"\n\n`);
      }

      setDismissedSelectedText(null);
      setHighlightedText(trimmedSelectedText);
      setSelectionConversationContext({
        messageStartIndex: messageCount,
        selectedText: trimmedSelectedText,
      });
      persistSelectionGeometry();
      return trimmedSelectedText;
    },
    [
      allowSelectedTextSupport,
      messageCount,
      persistSelectionGeometry,
      selectedText,
      setDismissedSelectedText,
      setHighlightedText,
      setInputValue,
      setSelectionConversationContext,
    ]
  );

  const resetAskModalState = useCallback((): void => {
    setAskModalVisible(false);
    askModalReturnStateRef.current = null;
    avatarDragStateRef.current = null;
    setIsAvatarDragging(false);
    setAskModalDockStyle(null);
  }, [
    askModalReturnStateRef,
    avatarDragStateRef,
    setAskModalDockStyle,
    setAskModalVisible,
    setIsAvatarDragging,
  ]);

  const handleOpenChat = useCallback(
    (
      reason: 'toggle' | 'selection' | 'selection_explain' | 'section_explain' | 'ask_modal',
      options?: {
        panelShellMode?: TutorPanelShellMode;
      }
    ): void => {
      if (reason !== 'ask_modal') {
        resetAskModalState();
      }

      setCanonicalTutorModalVisible(false);
      setGuestAuthFormVisible(false);
      setGuestIntroVisible(false);
      setGuestIntroHelpVisible(false);
      setLauncherPromptVisible(false);
      if (reason === 'selection_explain' || reason === 'section_explain') {
        setContextualTutorMode(reason);
      } else {
        setContextualTutorMode(null);
      }
      setPanelAnchorMode(reason === 'toggle' ? 'dock' : 'contextual');
      setPanelMotionState('animating');
      setPanelShellMode(options?.panelShellMode ?? 'default');
      trackKangurClientEvent('kangur_ai_tutor_opened', {
        ...telemetryContext,
        reason,
        hasSelectedText: Boolean(activeSelectedText),
        messageCount,
      });
      openChat();
    },
    [
      activeSelectedText,
      messageCount,
      openChat,
      resetAskModalState,
      setCanonicalTutorModalVisible,
      setContextualTutorMode,
      setGuestAuthFormVisible,
      setGuestIntroHelpVisible,
      setGuestIntroVisible,
      setLauncherPromptVisible,
      setPanelAnchorMode,
      setPanelMotionState,
      setPanelShellMode,
      telemetryContext,
    ]
  );

  const handleCloseChat = useCallback(
    (reason: 'toggle' | 'header' | 'outside'): void => {
      trackKangurClientEvent('kangur_ai_tutor_closed', {
        ...telemetryContext,
        reason,
        messageCount,
      });
      setCanonicalTutorModalVisible(false);
      setGuestAuthFormVisible(false);
      setGuestIntroVisible(false);
      setGuestIntroHelpVisible(false);
      if (selectionExplainTimeoutRef.current !== null) {
        window.clearTimeout(selectionExplainTimeoutRef.current);
        selectionExplainTimeoutRef.current = null;
      }
      if (selectionGuidanceRevealTimeoutRef.current !== null) {
        window.clearTimeout(selectionGuidanceRevealTimeoutRef.current);
        selectionGuidanceRevealTimeoutRef.current = null;
      }
      setSelectionGuidanceCalloutVisibleText(null);
      setSelectionGuidanceHandoffText(null);
      setSelectionConversationContext(null);
      setSelectionResponsePending(null);
      setSelectionResponseComplete(null);
      setSectionResponsePending(null);
      setSectionResponseComplete(null);
      setGuidedTutorTarget(null);
      setHighlightedSection(null);
      setHoveredSectionAnchorId(null);
      if (activeSelectedText) {
        setDismissedSelectedText(activeSelectedText);
        clearSelection();
        setHighlightedText(null);
        setPersistedSelectionRect(null);
        setPersistedSelectionPageRect(null);
        setPersistedSelectionPageRects([]);
        setPersistedSelectionContainerRect(null);
      }
      setContextualTutorMode(null);
      setPanelShellMode('default');
      closeChat();
      if (activeSelectedText) {
        setHighlightedText(null);
      }
    },
    [
      activeSelectedText,
      clearSelection,
      closeChat,
      messageCount,
      setCanonicalTutorModalVisible,
      setGuestAuthFormVisible,
      setGuestIntroHelpVisible,
      setGuestIntroVisible,
      setGuidedTutorTarget,
      setHighlightedSection,
      setHighlightedText,
      setContextualTutorMode,
      setDismissedSelectedText,
      setHoveredSectionAnchorId,
      setPanelShellMode,
      setPersistedSelectionContainerRect,
      setPersistedSelectionPageRect,
      setPersistedSelectionPageRects,
      setPersistedSelectionRect,
      setSectionResponseComplete,
      setSectionResponsePending,
      selectionExplainTimeoutRef,
      selectionGuidanceRevealTimeoutRef,
      setSelectionGuidanceCalloutVisibleText,
      setSelectionConversationContext,
      setSelectionGuidanceHandoffText,
      setSelectionResponseComplete,
      setSelectionResponsePending,
      telemetryContext,
    ]
  );

  const handleCloseAskModal = useCallback(
    (reason: 'toggle' | 'header' | 'outside' = 'header'): void => {
      const returnState = askModalReturnStateRef.current;
      setAskModalVisible(false);
      askModalReturnStateRef.current = null;
      avatarDragStateRef.current = null;
      suppressAvatarClickRef.current = false;
      setIsAvatarDragging(false);
      setAskModalDockStyle(null);
      setHomeOnboardingStepIndex(null);
      setDraggedAvatarPoint(null);
      clearPersistedTutorAvatarPosition();
      setLauncherPromptVisible(returnState?.launcherPromptVisible ?? false);
      setGuestAuthFormVisible(false);
      setGuestIntroVisible(returnState?.guestIntroVisible ?? false);
      setGuestIntroHelpVisible(returnState?.guestIntroHelpVisible ?? false);
      setGuidedTutorTarget(returnState?.guidedTutorTarget ?? null);
      setContextualTutorMode(null);

      if (!returnState?.wasOpen) {
        handleCloseChat(reason);
      }
    },
    [
      askModalReturnStateRef,
      avatarDragStateRef,
      handleCloseChat,
      setAskModalDockStyle,
      setAskModalVisible,
      setDraggedAvatarPoint,
      setContextualTutorMode,
      setGuestAuthFormVisible,
      setGuestIntroHelpVisible,
      setGuestIntroVisible,
      setGuidedTutorTarget,
      setHomeOnboardingStepIndex,
      setIsAvatarDragging,
      setLauncherPromptVisible,
      suppressAvatarClickRef,
    ]
  );

  const handleDisableTutor = useCallback((): void => {
    trackKangurClientEvent('kangur_ai_tutor_hidden', {
      ...telemetryContext,
      isOpen,
      messageCount,
    });
    setAskModalVisible(false);
    askModalReturnStateRef.current = null;
    setGuidedTutorTarget(null);
    setContextualTutorMode(null);
    setGuestAuthFormVisible(false);
    setGuestIntroVisible(false);
    setGuestIntroHelpVisible(false);
    if (selectionExplainTimeoutRef.current !== null) {
      window.clearTimeout(selectionExplainTimeoutRef.current);
      selectionExplainTimeoutRef.current = null;
    }
    if (selectionGuidanceRevealTimeoutRef.current !== null) {
      window.clearTimeout(selectionGuidanceRevealTimeoutRef.current);
      selectionGuidanceRevealTimeoutRef.current = null;
    }
    setHomeOnboardingStepIndex(null);
    setHasNewMessage(false);
    setDraggedAvatarPoint(null);
    setPanelPosition(null);
    setPanelPositionMode('manual');
    setPanelSnapPreference('free');
    clearSelection();
    clearPersistedTutorAvatarPosition();
    clearPersistedTutorPanelPosition();
    setHighlightedText(null);
    setPersistedSelectionRect(null);
    setPersistedSelectionPageRect(null);
    setPersistedSelectionPageRects([]);
    setPersistedSelectionContainerRect(null);
    setSelectionGuidanceCalloutVisibleText(null);
    setSelectionConversationContext(null);
    setSelectionGuidanceHandoffText(null);
    closeChat();
    persistTutorVisibilityHidden(true);
  }, [
    askModalReturnStateRef,
    clearSelection,
    closeChat,
    isOpen,
    messageCount,
      setAskModalVisible,
      setGuestIntroHelpVisible,
      setGuestIntroVisible,
      setGuestAuthFormVisible,
      setGuidedTutorTarget,
      setHasNewMessage,
    setDraggedAvatarPoint,
    setPanelPosition,
    setPanelPositionMode,
    setPanelSnapPreference,
    setContextualTutorMode,
    setHighlightedText,
    setHomeOnboardingStepIndex,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionPageRects,
    setPersistedSelectionRect,
    selectionExplainTimeoutRef,
    selectionGuidanceRevealTimeoutRef,
    setSelectionGuidanceCalloutVisibleText,
    setSelectionConversationContext,
    setSelectionGuidanceHandoffText,
    telemetryContext,
  ]);

  const handleResetPanelPosition = useCallback((): void => {
    trackKangurClientEvent('kangur_ai_tutor_panel_position_reset', {
      ...telemetryContext,
      hasSelectedText: Boolean(activeSelectedText),
      isOpen,
      messageCount,
    });
    setPanelPosition(null);
    setPanelPositionMode('manual');
    setPanelSnapPreference('free');
    clearPersistedTutorPanelPosition();
  }, [
    activeSelectedText,
    isOpen,
    messageCount,
    setPanelPosition,
    setPanelPositionMode,
    setPanelSnapPreference,
    telemetryContext,
  ]);

  const handleMovePanelToContext = useCallback((): void => {
    if (!freeformContextualPanelPoint) {
      return;
    }

    trackKangurClientEvent('kangur_ai_tutor_panel_moved_to_context', {
      ...telemetryContext,
      hasSelectedText: Boolean(activeSelectedText),
      isOpen,
      messageCount,
    });
    setPanelPosition(freeformContextualPanelPoint);
    setPanelPositionMode('contextual');
    setPanelSnapPreference('free');
    persistTutorPanelPosition({
      left: freeformContextualPanelPoint.x,
      mode: 'contextual',
      snap: 'free',
      top: freeformContextualPanelPoint.y,
    });
  }, [
    activeSelectedText,
    freeformContextualPanelPoint,
    isOpen,
    messageCount,
    setPanelPosition,
    setPanelPositionMode,
    setPanelSnapPreference,
    telemetryContext,
  ]);

  const handleDetachPanelFromContext = useCallback((): void => {
    trackKangurClientEvent('kangur_ai_tutor_panel_detached_from_context', {
      ...telemetryContext,
      hasSelectedText: Boolean(activeSelectedText),
      isOpen,
      messageCount,
    });
    setPanelPositionMode('manual');

    const persistedPoint = panelPosition ?? freeformContextualPanelPoint;
    if (!persistedPoint) {
      clearPersistedTutorPanelPosition();
      return;
    }

    persistTutorPanelPosition({
      left: persistedPoint.x,
      mode: 'manual',
      snap: panelSnapPreference,
      top: persistedPoint.y,
    });
  }, [
    activeSelectedText,
    freeformContextualPanelPoint,
    isOpen,
    messageCount,
    panelPosition,
    panelSnapPreference,
    setPanelPositionMode,
    telemetryContext,
  ]);

  const handlePanelHeaderClose = useCallback((): void => {
    if (isAskModalMode) {
      handleCloseAskModal('header');
      return;
    }

    handleCloseChat('header');
  }, [handleCloseAskModal, handleCloseChat, isAskModalMode]);

  const handlePanelBackdropClose = useCallback((): void => {
    if (isAskModalMode) {
      handleCloseAskModal('outside');
      return;
    }

    handleCloseChat('outside');
  }, [handleCloseAskModal, handleCloseChat, isAskModalMode]);

  const handleCloseLauncherPrompt = useCallback((): void => {
    setLauncherPromptVisible(false);
  }, [setLauncherPromptVisible]);

  const handleCloseGuestIntroCard = useCallback((): void => {
    setGuestIntroVisible(false);
    setGuestIntroHelpVisible(false);
  }, [setGuestIntroHelpVisible, setGuestIntroVisible]);

  useEffect(() => {
    if (!isOpen || bubblePlacementMode !== 'bubble') {
      return;
    }

    const handlePointerDown = (event: PointerEvent): void => {
      if (isTargetWithinTutorUi(event.target)) {
        return;
      }

      handleCloseChat('outside');
    };

    document.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [bubblePlacementMode, handleCloseChat, isOpen, isTargetWithinTutorUi]);

  const handleSelectionActionMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
  }, []);

  const handleAvatarMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>): void => {
      if (!isOpen && allowSelectedTextSupport && selectedText && selectionRect) {
        event.preventDefault();
      }
    },
    [allowSelectedTextSupport, isOpen, selectedText, selectionRect]
  );

  return {
    handleAvatarMouseDown,
    handleCloseAskModal,
    handleCloseChat,
    handleCloseGuestIntroCard,
    handleCloseLauncherPrompt,
    handleDetachPanelFromContext,
    handleDisableTutor,
    handleMovePanelToContext,
    handleOpenChat,
    handlePanelBackdropClose,
    handlePanelHeaderClose,
    handleResetPanelPosition,
    handleSelectionActionMouseDown,
    persistSelectionContext,
    resetAskModalState,
  };
}
