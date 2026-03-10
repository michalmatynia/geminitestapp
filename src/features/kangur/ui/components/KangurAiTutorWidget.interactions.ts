'use client';

import { useCallback, useEffect, type MouseEvent as ReactMouseEvent } from 'react';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';

import {
  clearPersistedTutorAvatarPosition,
  persistTutorVisibilityHidden,
} from './KangurAiTutorWidget.storage';

import type { KangurAiTutorWidgetState } from './KangurAiTutorWidget.state';

type TelemetryContext = {
  contentId: string | null;
  surface: string | null;
  title: string | null;
};

type UseKangurAiTutorPanelInteractionsInput = {
  activeFocusKind: string | null;
  activeSelectedText: string | null;
  allowSelectedTextSupport: boolean;
  bubblePlacementMode: string;
  clearSelection: () => void;
  closeChat: () => void;
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
    | 'setAskModalDockStyle'
    | 'setAskModalVisible'
    | 'setDismissedSelectedText'
    | 'setDraggedAvatarPoint'
    | 'setGuestIntroHelpVisible'
    | 'setGuestIntroVisible'
    | 'setGuidedTutorTarget'
    | 'setHasNewMessage'
    | 'setHomeOnboardingStepIndex'
    | 'setHoveredSectionAnchorId'
    | 'setIsAvatarDragging'
    | 'setLauncherPromptVisible'
    | 'setPanelAnchorMode'
    | 'setPersistedSelectionContainerRect'
    | 'setPersistedSelectionPageRect'
    | 'setPersistedSelectionRect'
    | 'setSelectionConversationContext'
    | 'setSelectionResponseComplete'
    | 'setSelectionResponsePending'
    | 'suppressAvatarClickRef'
  >;
};

export function useKangurAiTutorPanelInteractions({
  activeFocusKind,
  activeSelectedText,
  allowSelectedTextSupport,
  bubblePlacementMode,
  clearSelection,
  closeChat,
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
    setAskModalDockStyle,
    setAskModalVisible,
    setDismissedSelectedText,
    setDraggedAvatarPoint,
    setGuestIntroHelpVisible,
    setGuestIntroVisible,
    setGuidedTutorTarget,
    setHasNewMessage,
    setHomeOnboardingStepIndex,
    setHoveredSectionAnchorId,
    setIsAvatarDragging,
    setLauncherPromptVisible,
    setPanelAnchorMode,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionRect,
    setSelectionConversationContext,
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
        selectedText: trimmedSelectedText,
      });
      persistSelectionGeometry();
      return trimmedSelectedText;
    },
    [
      allowSelectedTextSupport,
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
      reason: 'toggle' | 'selection' | 'selection_explain' | 'section_explain' | 'ask_modal'
    ): void => {
      if (reason !== 'ask_modal') {
        resetAskModalState();
      }

      setPanelAnchorMode(reason === 'toggle' ? 'dock' : 'contextual');
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
      setPanelAnchorMode,
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
      setSelectionResponsePending(null);
      setSelectionResponseComplete(null);
      setHoveredSectionAnchorId(null);
      if (reason === 'outside' && activeFocusKind === 'selection') {
        clearSelection();
        setHighlightedText(null);
        setPersistedSelectionRect(null);
        setPersistedSelectionPageRect(null);
        setPersistedSelectionContainerRect(null);
      }
      closeChat();
    },
    [
      activeFocusKind,
      clearSelection,
      closeChat,
      messageCount,
      setHighlightedText,
      setHoveredSectionAnchorId,
      setPersistedSelectionContainerRect,
      setPersistedSelectionPageRect,
      setPersistedSelectionRect,
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
      setGuestIntroVisible(returnState?.guestIntroVisible ?? false);
      setGuestIntroHelpVisible(returnState?.guestIntroHelpVisible ?? false);
      setGuidedTutorTarget(returnState?.guidedTutorTarget ?? null);

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
    setGuestIntroVisible(false);
    setGuestIntroHelpVisible(false);
    setHomeOnboardingStepIndex(null);
    setHasNewMessage(false);
    clearSelection();
    setHighlightedText(null);
    setPersistedSelectionRect(null);
    setPersistedSelectionContainerRect(null);
    setSelectionConversationContext(null);
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
    setGuidedTutorTarget,
    setHasNewMessage,
    setHighlightedText,
    setHomeOnboardingStepIndex,
    setPersistedSelectionContainerRect,
    setPersistedSelectionRect,
    setSelectionConversationContext,
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
    handleDisableTutor,
    handleOpenChat,
    handlePanelBackdropClose,
    handlePanelHeaderClose,
    handleSelectionActionMouseDown,
    persistSelectionContext,
    resetAskModalState,
  };
}
