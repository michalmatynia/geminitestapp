'use client';

import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import { clearPersistedTutorAvatarPosition } from './KangurAiTutorWidget.storage';

import type {
  GuidedTutorTarget,
  PendingSelectionResponse,
  SectionExplainContext,
  TutorPanelShellMode,
  TutorPoint,
} from './KangurAiTutorWidget.types';

type GuidedMode = 'home_onboarding' | 'selection' | 'section' | 'auth' | null;

export function useKangurAiTutorAvatarShellActions(input: {
  canonicalTutorModalVisible: boolean;
  closeChat: () => void;
  guestIntroHelpVisible: boolean;
  guestIntroVisible: boolean;
  guidedMode: GuidedMode;
  guidedTutorTarget: GuidedTutorTarget | null;
  handleCloseChat: (reason: 'toggle' | 'header' | 'outside') => void;
  handleCloseLauncherPrompt: () => void;
  handleHomeOnboardingFinishEarly: () => void;
  handleOpenChat: (
    reason: 'toggle' | 'selection' | 'selection_explain' | 'section_explain' | 'ask_modal',
    options?: {
      panelShellMode?: TutorPanelShellMode;
    }
  ) => void;
  homeOnboardingStepIndex: number | null;
  isAnonymousVisitor: boolean;
  isOpen: boolean;
  launcherPromptVisible: boolean;
  persistSelectionContext: (options?: { prefillInput?: boolean }) => string | null;
  selectionExplainTimeoutRef: MutableRefObject<number | null>;
  setCanonicalTutorModalVisible: Dispatch<SetStateAction<boolean>>;
  setContextualTutorMode: Dispatch<
    SetStateAction<'selection_explain' | 'section_explain' | null>
  >;
  setDraggedAvatarPoint: Dispatch<SetStateAction<TutorPoint | null>>;
  setGuestIntroHelpVisible: Dispatch<SetStateAction<boolean>>;
  setGuestIntroVisible: Dispatch<SetStateAction<boolean>>;
  setGuidedTutorTarget: Dispatch<SetStateAction<GuidedTutorTarget | null>>;
  setHighlightedSection: Dispatch<SetStateAction<SectionExplainContext | null>>;
  setHoveredSectionAnchorId: Dispatch<SetStateAction<string | null>>;
  setSectionResponseComplete: Dispatch<SetStateAction<SectionExplainContext | null>>;
  setSectionResponsePending: Dispatch<SetStateAction<SectionExplainContext | null>>;
  setSelectionResponseComplete: Dispatch<SetStateAction<PendingSelectionResponse | null>>;
  setSelectionResponsePending: Dispatch<SetStateAction<PendingSelectionResponse | null>>;
  setSelectionGuidanceHandoffText: Dispatch<SetStateAction<string | null>>;
  startGuidedSelectionExplanation: (selectedText: string) => void;
  suppressAvatarClickRef: MutableRefObject<boolean>;
}) {
  const {
    canonicalTutorModalVisible,
    closeChat,
    guidedMode,
    guidedTutorTarget,
    handleCloseChat,
    handleCloseLauncherPrompt,
    handleHomeOnboardingFinishEarly,
    handleOpenChat,
    homeOnboardingStepIndex,
    isAnonymousVisitor,
    isOpen,
    launcherPromptVisible,
    persistSelectionContext,
    selectionExplainTimeoutRef,
    setCanonicalTutorModalVisible,
    setContextualTutorMode,
    setDraggedAvatarPoint,
    setGuestIntroHelpVisible,
    setGuestIntroVisible,
    setGuidedTutorTarget,
    setHighlightedSection,
    setHoveredSectionAnchorId,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    setSelectionGuidanceHandoffText,
    startGuidedSelectionExplanation,
    suppressAvatarClickRef,
  } = input;

  const clearPendingGuidance = useCallback((): void => {
    if (selectionExplainTimeoutRef.current !== null) {
      window.clearTimeout(selectionExplainTimeoutRef.current);
      selectionExplainTimeoutRef.current = null;
    }

    setSelectionResponsePending(null);
    setSelectionResponseComplete(null);
    setSectionResponsePending(null);
    setSectionResponseComplete(null);
  }, [
    selectionExplainTimeoutRef,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionResponseComplete,
    setSelectionResponsePending,
  ]);

  const resetAvatarShellState = useCallback((): void => {
    clearPendingGuidance();
    setHighlightedSection(null);
    setHoveredSectionAnchorId(null);
    setContextualTutorMode(null);
    setSelectionGuidanceHandoffText(null);
    setGuidedTutorTarget(null);
    setGuestIntroVisible(false);
    setGuestIntroHelpVisible(false);
  }, [
    clearPendingGuidance,
    setContextualTutorMode,
    setGuestIntroHelpVisible,
    setGuestIntroVisible,
    setGuidedTutorTarget,
    setHighlightedSection,
    setHoveredSectionAnchorId,
    setSelectionGuidanceHandoffText,
  ]);

  const handleAskAbout = useCallback((): void => {
    const persistedSelectedText = persistSelectionContext();
    if (!persistedSelectedText) {
      return;
    }

    startGuidedSelectionExplanation(persistedSelectedText);
  }, [persistSelectionContext, startGuidedSelectionExplanation]);

  const openCanonicalOnboarding = useCallback((): void => {
    resetAvatarShellState();

    if (isOpen) {
      handleCloseChat('toggle');
    }

    setCanonicalTutorModalVisible(true);
  }, [
    handleCloseChat,
    isOpen,
    resetAvatarShellState,
    setCanonicalTutorModalVisible,
  ]);

  const handleAvatarClick = useCallback((): void => {
    if (suppressAvatarClickRef.current) {
      suppressAvatarClickRef.current = false;
      return;
    }

    if (homeOnboardingStepIndex !== null) {
      handleHomeOnboardingFinishEarly();
      if (isAnonymousVisitor) {
        openCanonicalOnboarding();
      } else {
        resetAvatarShellState();
        handleOpenChat('toggle', { panelShellMode: 'minimal' });
      }
      return;
    }

    if (launcherPromptVisible) {
      handleCloseLauncherPrompt();
    }

    if (isAnonymousVisitor) {
      if (canonicalTutorModalVisible) {
        setCanonicalTutorModalVisible(false);
        setGuestIntroVisible(false);
        setGuestIntroHelpVisible(false);
        return;
      }
      openCanonicalOnboarding();
      return;
    }

    // Authenticated user path: never show the guest intro panel.
    if (isOpen) {
      handleCloseChat('toggle');
      return;
    }

    if (guidedTutorTarget) {
      resetAvatarShellState();
      return;
    }

    handleOpenChat('toggle', { panelShellMode: 'minimal' });
  }, [
    canonicalTutorModalVisible,
    guidedTutorTarget,
    handleCloseChat,
    handleCloseLauncherPrompt,
    handleHomeOnboardingFinishEarly,
    handleOpenChat,
    homeOnboardingStepIndex,
    isAnonymousVisitor,
    isOpen,
    launcherPromptVisible,
    openCanonicalOnboarding,
    resetAvatarShellState,
    setCanonicalTutorModalVisible,
    setGuestIntroHelpVisible,
    setGuestIntroVisible,
    suppressAvatarClickRef,
  ]);

  const handleCloseGuidedCallout = useCallback((): void => {
    if (guidedMode === 'home_onboarding') {
      handleHomeOnboardingFinishEarly();
      return;
    }

    clearPendingGuidance();

    if (guidedMode === 'section') {
      setHighlightedSection(null);
      setHoveredSectionAnchorId(null);
    }

    setGuidedTutorTarget(null);
    setContextualTutorMode(null);
    setDraggedAvatarPoint(null);
    setCanonicalTutorModalVisible(false);
    clearPersistedTutorAvatarPosition();
    closeChat();
  }, [
    setCanonicalTutorModalVisible,
    clearPendingGuidance,
    closeChat,
    guidedMode,
    handleHomeOnboardingFinishEarly,
    setContextualTutorMode,
    setDraggedAvatarPoint,
    setGuidedTutorTarget,
    setHighlightedSection,
    setHoveredSectionAnchorId,
  ]);

  return {
    handleAskAbout,
    handleAvatarClick,
    handleCloseGuidedCallout,
  };
}
