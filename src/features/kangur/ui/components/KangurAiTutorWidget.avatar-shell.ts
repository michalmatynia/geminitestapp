'use client';

import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import {
  clearPersistedTutorAvatarPosition,
  type KangurAiTutorGuestIntroRecord,
} from './KangurAiTutorWidget.storage';

import type {
  GuidedTutorTarget,
  PendingSelectionResponse,
  SectionExplainContext,
  TutorPoint,
} from './KangurAiTutorWidget.types';

type GuidedMode = 'home_onboarding' | 'selection' | 'section' | 'auth' | null;

export function useKangurAiTutorAvatarShellActions(input: {
  closeChat: () => void;
  enabled: boolean;
  guestIntroHelpVisible: boolean;
  guestIntroRecord: KangurAiTutorGuestIntroRecord | null;
  guestIntroVisible: boolean;
  guidedMode: GuidedMode;
  guidedTutorTarget: GuidedTutorTarget | null;
  handleCloseChat: (reason: 'toggle' | 'header' | 'outside') => void;
  handleCloseLauncherPrompt: () => void;
  handleHomeOnboardingFinishEarly: () => void;
  handleOpenChat: (
    reason: 'toggle' | 'selection' | 'selection_explain' | 'section_explain' | 'ask_modal'
  ) => void;
  homeOnboardingStepIndex: number | null;
  isAnonymousVisitor: boolean;
  isOpen: boolean;
  launcherPromptVisible: boolean;
  persistSelectionContext: (options?: { prefillInput?: boolean }) => string | null;
  selectionExplainTimeoutRef: MutableRefObject<number | null>;
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
    closeChat,
    enabled,
    guestIntroHelpVisible,
    guestIntroRecord,
    guestIntroVisible,
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

  const shouldOpenCanonicalOnboarding = isAnonymousVisitor
    ? isOpen || guestIntroRecord?.status === 'dismissed'
    : !enabled;
  const shouldKeepAnonymousAvatarDocked =
    isAnonymousVisitor && !enabled && !isOpen && !shouldOpenCanonicalOnboarding;

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

  const handleAskAbout = useCallback((): void => {
    const persistedSelectedText = persistSelectionContext();
    if (!persistedSelectedText) {
      return;
    }

    startGuidedSelectionExplanation(persistedSelectedText);
  }, [persistSelectionContext, startGuidedSelectionExplanation]);

  const openCanonicalOnboarding = useCallback((): void => {
    clearPendingGuidance();
    setHighlightedSection(null);
    setHoveredSectionAnchorId(null);
    setContextualTutorMode(null);
    setSelectionGuidanceHandoffText(null);
    setGuidedTutorTarget(null);

    if (isOpen) {
      handleCloseChat('toggle');
    }

    setGuestIntroHelpVisible(false);
    setGuestIntroVisible(true);
  }, [
    clearPendingGuidance,
    handleCloseChat,
    isOpen,
    setContextualTutorMode,
    setGuestIntroHelpVisible,
    setGuestIntroVisible,
    setGuidedTutorTarget,
    setHighlightedSection,
    setHoveredSectionAnchorId,
    setSelectionGuidanceHandoffText,
  ]);

  const handleAvatarClick = useCallback((): void => {
    if (suppressAvatarClickRef.current) {
      suppressAvatarClickRef.current = false;
      return;
    }

    if (homeOnboardingStepIndex !== null) {
      handleHomeOnboardingFinishEarly();
      return;
    }

    if (guestIntroVisible || guestIntroHelpVisible) {
      return;
    }

    if (launcherPromptVisible) {
      handleCloseLauncherPrompt();
      return;
    }

    if (guidedTutorTarget) {
      clearPendingGuidance();
      setHighlightedSection(null);
      setHoveredSectionAnchorId(null);
      setContextualTutorMode(null);
      setGuidedTutorTarget(null);
      if (!isOpen) {
        if (shouldOpenCanonicalOnboarding) {
          openCanonicalOnboarding();
        } else {
          handleOpenChat('toggle');
        }
      }
      return;
    }

    if (isOpen) {
      if (shouldOpenCanonicalOnboarding) {
        openCanonicalOnboarding();
      } else {
        handleCloseChat('toggle');
      }
      return;
    }

    if (shouldOpenCanonicalOnboarding) {
      openCanonicalOnboarding();
      return;
    }

    if (shouldKeepAnonymousAvatarDocked) {
      return;
    }

    handleOpenChat('toggle');
  }, [
    clearPendingGuidance,
    enabled,
    guestIntroHelpVisible,
    guestIntroRecord,
    guestIntroVisible,
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
    setContextualTutorMode,
    setGuestIntroHelpVisible,
    setGuestIntroVisible,
    setGuidedTutorTarget,
    setHighlightedSection,
    setHoveredSectionAnchorId,
    shouldKeepAnonymousAvatarDocked,
    suppressAvatarClickRef,
    shouldOpenCanonicalOnboarding,
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
    clearPersistedTutorAvatarPosition();
    closeChat();
  }, [
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
