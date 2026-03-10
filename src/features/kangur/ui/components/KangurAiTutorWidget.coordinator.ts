'use client';

import { useMemo, type CSSProperties } from 'react';

import type { KangurAiTutorContextValue } from '@/features/kangur/ui/context/KangurAiTutorRuntime.shared';
import type { KangurAuthContextValue } from '@/features/kangur/ui/context/KangurAuthContext';
import type { KangurLoginModalAuthMode } from '@/features/kangur/ui/context/KangurLoginModalContext';
import type {
  KangurAiTutorFocusKind,
  KangurAiTutorPromptMode,
} from '@/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';
import { cn } from '@/shared/utils';

import { useKangurAiTutorAvatarDrag } from './KangurAiTutorWidget.avatar-drag';
import { useKangurAiTutorAvatarShellActions } from './KangurAiTutorWidget.avatar-shell';
import { useKangurAiTutorConversationViewState } from './KangurAiTutorWidget.conversation-view';
import { useKangurAiTutorGuidedDisplayState } from './KangurAiTutorWidget.display';
import {
  useKangurAiTutorGuidanceCompletionEffects,
  useKangurAiTutorNarrationObserverEffect,
} from './KangurAiTutorWidget.effects';
import {
  useKangurAiTutorGuestIntroFlow,
  useKangurAiTutorGuidedAuthHandoffEffect,
  useKangurAiTutorHomeOnboardingFlow,
} from './KangurAiTutorWidget.entry';
import { useKangurAiTutorWidgetEnvironment } from './KangurAiTutorWidget.environment';
import {
  useKangurAiTutorBubblePlacementState,
  useKangurAiTutorFocusLayoutState,
} from './KangurAiTutorWidget.focus-layout';
import {
  useKangurAiTutorGuidedFlow,
  useKangurAiTutorSelectionGuidanceHandoffEffect,
} from './KangurAiTutorWidget.guided';
import { useKangurAiTutorGuidedShellState } from './KangurAiTutorWidget.guided-shell';
import { isAuthGuidedTutorTarget } from './KangurAiTutorWidget.helpers';
import { useKangurAiTutorPanelInteractions } from './KangurAiTutorWidget.interactions';
import { useKangurAiTutorLifecycleEffects } from './KangurAiTutorWidget.lifecycle';
import { useKangurAiTutorPanelActions } from './KangurAiTutorWidget.panel-actions';
import { useKangurAiTutorPanelDerivedState } from './KangurAiTutorWidget.panel-derived';
import { useKangurAiTutorPanelShellState } from './KangurAiTutorWidget.panel-shell';
import { useKangurAiTutorPortalViewModel } from './KangurAiTutorWidget.portal-view';
import { useKangurAiTutorTelemetryBridge } from './KangurAiTutorWidget.telemetry';

import type { KangurAiTutorPortalContextValue } from './KangurAiTutorPortal.context';
import type { ActiveTutorFocus } from './KangurAiTutorWidget.shared';
import type { KangurAiTutorWidgetState } from './KangurAiTutorWidget.state';
import type { TutorSurface } from './KangurAiTutorWidget.types';

const FLOATING_TUTOR_AVATAR_RIM_COLOR = '#78350f';
const HOME_ONBOARDING_ELIGIBLE_CONTENT_ID = 'game:home';
const CONTEXTLESS_TUTOR_EMPTY_STATE_MESSAGE =
  'Otworz lekcje, gre albo test, a pomoge Ci w konkretnym zadaniu.';
const CONTEXTLESS_TUTOR_DISABLED_PLACEHOLDER =
  'Przejdz do lekcji, gry albo testu, aby zadac pytanie.';

type LoginModalState = {
  authMode: KangurLoginModalAuthMode;
  isOpen: boolean;
};

type UseKangurAiTutorWidgetCoordinatorInput = {
  authState: KangurAuthContextValue | null;
  environment: ReturnType<typeof useKangurAiTutorWidgetEnvironment>;
  loginModal: LoginModalState;
  prefersReducedMotion: boolean | undefined;
  tutorContent: KangurAiTutorContent;
  tutorRuntime: KangurAiTutorContextValue;
  widgetState: KangurAiTutorWidgetState;
};

const getInteractionIntent = (
  promptMode: KangurAiTutorPromptMode,
  focusKind: ActiveTutorFocus['kind'],
  answerRevealed: boolean | undefined
): 'hint' | 'explain' | 'review' | 'next_step' => {
  if (promptMode === 'hint') {
    return 'hint';
  }

  if (promptMode === 'explain' || promptMode === 'selected_text') {
    return answerRevealed && focusKind === 'review' ? 'review' : 'explain';
  }

  return 'next_step';
};

const normalizeConversationFocusKind = (
  focusKind: ActiveTutorFocus['kind']
): KangurAiTutorFocusKind | undefined => {
  switch (focusKind) {
    case 'selection':
    case 'lesson_header':
    case 'assignment':
    case 'document':
    case 'home_actions':
    case 'home_quest':
    case 'priority_assignments':
    case 'leaderboard':
    case 'progress':
    case 'question':
    case 'review':
    case 'summary':
      return focusKind;
    default:
      return undefined;
  }
};

const resolveTutorFollowUpLocation = (
  href: string
): { pathname: string; search: string } | null => {
  try {
    const resolved = new URL(
      href,
      typeof window === 'undefined' ? 'https://kangur.local' : window.location.origin
    );

    return {
      pathname: resolved.pathname,
      search: resolved.search,
    };
  } catch {
    return null;
  }
};

const getCurrentTutorLocation = (): { pathname: string; search: string } | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return {
    pathname: window.location.pathname,
    search: window.location.search,
  };
};

const getContextSwitchNotice = (input: {
  tutorContent: KangurAiTutorContent;
  surface: TutorSurface | null | undefined;
  title?: string | null | undefined;
  contentId: string | null | undefined;
  questionProgressLabel?: string | null | undefined;
  questionId: string | null | undefined;
  assignmentSummary?: string | null | undefined;
  assignmentId: string | null | undefined;
}): {
  title: string;
  target: string;
  detail: string | null;
} | null => {
  if (!input.surface) {
    return null;
  }

  const surfaceLabel =
    input.surface === 'test'
      ? input.tutorContent.panelChrome.surfaceLabels.test
      : input.surface === 'game'
        ? input.tutorContent.panelChrome.surfaceLabels.game
        : input.tutorContent.panelChrome.surfaceLabels.lesson;
  const targetLabel = input.title?.trim()
    ? `${surfaceLabel}: ${input.title.trim()}`
    : input.contentId?.trim()
      ? `${surfaceLabel}: ${input.contentId.trim()}`
      : input.surface === 'test'
        ? input.tutorContent.panelChrome.contextFallbackTargets.test
        : input.surface === 'game'
          ? input.tutorContent.panelChrome.contextFallbackTargets.game
          : input.tutorContent.panelChrome.contextFallbackTargets.lesson;
  const detail = input.questionProgressLabel?.trim()
    ? input.questionProgressLabel.trim()
    : input.questionId?.trim()
      ? input.tutorContent.contextSwitch.detailCurrentQuestion
      : input.assignmentSummary?.trim()
        ? input.tutorContent.contextSwitch.detailCurrentAssignment
        : input.assignmentId?.trim()
          ? input.tutorContent.contextSwitch.detailCurrentAssignment
          : null;

  return {
    title: input.tutorContent.contextSwitch.title,
    target: targetLabel,
    detail,
  };
};

const isTargetWithinTutorUi = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) {
    return false;
  }

  return (
    target.closest('[data-testid="kangur-ai-tutor-panel"]') !== null ||
    target.closest('[data-testid="kangur-ai-tutor-ask-modal"]') !== null ||
    target.closest('[data-testid="kangur-ai-tutor-backdrop"]') !== null ||
    target.closest('[data-testid="kangur-ai-tutor-ask-modal-backdrop"]') !== null ||
    target.closest('[data-testid="kangur-ai-tutor-guided-login-help"]') !== null ||
    target.closest('[data-testid="kangur-ai-tutor-home-onboarding"]') !== null ||
    target.closest('[data-testid="kangur-ai-tutor-avatar"]') !== null
  );
};

const isSelectionWithinTutorUi = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return false;
  }

  const nodes = [selection.anchorNode, selection.focusNode];
  return nodes.some((node) => {
    if (!node) {
      return false;
    }

    const element = node instanceof Element ? node : node.parentElement;
    return Boolean(
      element?.closest('[data-testid="kangur-ai-tutor-panel"]') ||
        element?.closest('[data-testid="kangur-ai-tutor-ask-modal"]') ||
        element?.closest('[data-testid="kangur-ai-tutor-avatar"]') ||
        element?.closest('[data-testid="kangur-ai-tutor-selection-action"]')
    );
  });
};

export function useKangurAiTutorWidgetCoordinator({
  authState,
  environment,
  loginModal,
  prefersReducedMotion,
  tutorContent,
  tutorRuntime,
  widgetState,
}: UseKangurAiTutorWidgetCoordinatorInput): {
  portalContentValue: KangurAiTutorPortalContextValue;
  shouldRender: boolean;
} {
  const {
    enabled,
    messages,
    isLoading,
    isUsageLoading,
    tutorName,
    usageSummary,
    learnerMemory,
    openChat,
    closeChat,
    sendMessage,
    recordFollowUpCompletion,
    setHighlightedText,
    sessionContext,
  } = tutorRuntime;
  const {
    askModalDockStyle,
    askModalReturnStateRef,
    askModalVisible,
    avatarDragStateRef,
    contextSwitchNotice,
    draggedAvatarPoint,
    guestIntroCheckStartedRef,
    guestIntroHelpVisible,
    guestIntroLocalSuppressionTrackedRef,
    guestIntroRecord,
    guestIntroShownForCurrentEntryRef,
    guestIntroVisible,
    guidedTutorTarget,
    highlightedSection,
    homeOnboardingRecord,
    homeOnboardingShownForCurrentEntryRef,
    homeOnboardingStepIndex,
    hoveredSectionAnchorId,
    inputValue,
    isAvatarDragging,
    isTutorHidden,
    lastTrackedFocusKeyRef,
    lastTrackedProactiveNudgeKeyRef,
    lastTrackedQuotaKeyRef,
    launcherPromptVisible,
    mounted,
    motionTimeoutRef,
    panelAnchorMode,
    panelMeasuredHeight,
    persistedSelectionPageRect,
    persistedSelectionRect,
    sectionResponseComplete,
    sectionResponseCompleteTimeoutRef,
    sectionResponsePending,
    selectionConversationContext,
    selectionExplainTimeoutRef,
    selectionGuidanceHandoffText,
    selectionResponseComplete,
    selectionResponseCompleteTimeoutRef,
    selectionResponsePending,
    setAskModalDockStyle,
    setAskModalVisible,
    setDismissedSelectedText,
    setDraggedAvatarPoint,
    setGuestIntroHelpVisible,
    setGuestIntroRecord,
    setGuestIntroVisible,
    setGuidedTutorTarget,
    setHasNewMessage,
    setHighlightedSection,
    setHomeOnboardingRecord,
    setHomeOnboardingStepIndex,
    setHoveredSectionAnchorId,
    setInputValue,
    setIsAvatarDragging,
    setLauncherPromptVisible,
    setMessageFeedbackByKey,
    setPanelAnchorMode,
    setPanelMotionState,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionRect,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionConversationContext,
    setSelectionContextSpotlightTick,
    setSelectionGuidanceHandoffText,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    setTutorNarrationObservedText,
    setViewportTick,
    suppressAvatarClickRef,
    tutorNarrationObservedText,
    tutorNarrationRootRef,
    viewportTick,
  } = widgetState;
  const {
    activeSectionProtectedRect,
    activeSectionRect,
    activeSelectedText,
    activeSelectionContainerRect,
    activeSelectionPageRect,
    activeSelectionProtectedRect,
    activeSelectionRect,
    allowCrossPagePersistence,
    allowSelectedTextSupport,
    basePath,
    canSendMessages,
    clearSelection,
    hasAssignmentSummary,
    hasCurrentQuestion,
    hintDepth,
    homeOnboardingMode,
    isAnonymousVisitor,
    motionProfile,
    narratorSettings,
    proactiveNudges,
    rawSelectedText,
    reducedMotionTransitions,
    remainingMessages,
    resolveGuestLoginGuidanceIntentForContent,
    routing,
    selectedText,
    selectionRect,
    shouldRenderContextlessTutorUi,
    shouldRenderGuestIntroUi,
    shouldRepeatGuestIntroOnEntry,
    shouldRepeatHomeOnboardingOnEntry,
    showSources,
    telemetryContext,
    tutorAnchorContext,
    tutorNarratorContextRegistry,
    tutorSessionKey,
    uiMode,
    viewport,
    persistSelectionGeometry,
  } = environment;

  const guestTutorAssistantLabel = tutorName.trim() || tutorContent.common.defaultTutorName;

  useKangurAiTutorLifecycleEffects({
    allowCrossPagePersistence,
    allowSelectedTextSupport,
    authIsAuthenticated: authState?.isAuthenticated,
    clearSelection,
    closeChat,
    getContextSwitchNotice,
    getCurrentLocation: getCurrentTutorLocation,
    isOpen: tutorRuntime.isOpen,
    messages,
    rawSelectedText,
    recordFollowUpCompletion,
    routingPageKey: routing?.pageKey,
    selectedText,
    sessionContext,
    setHighlightedText,
    tutorContent,
    tutorSessionKey,
    viewport,
    widgetState,
  });

  const {
    canStartHomeOnboardingManually,
    guidedCalloutDetail,
    guidedCalloutHeaderLabel,
    guidedCalloutKey,
    sectionGuidanceLabel,
    guidedCalloutStepLabel,
    guidedCalloutTestId,
    guidedCalloutTitle,
    guidedFallbackRect,
    guidedMode,
    guidedSectionFocusRect,
    guidedSelectionPreview,
    guidedSelectionRect,
    guidedSelectionSpotlightRect,
    guidedTargetAnchor,
    homeOnboardingAnchor,
    homeOnboardingReplayLabel,
    homeOnboardingStep,
    homeOnboardingSteps,
    hoveredSectionAnchor,
    hoveredSectionProtectedRect,
    isAskModalMode,
    isEligibleForHomeOnboarding,
    isSectionGuidedTutorMode,
    isSelectionGuidedTutorMode,
    sectionResponsePendingKind,
    showSectionGuidanceCallout,
    showSelectionGuidanceCallout,
  } = useKangurAiTutorGuidedDisplayState({
    activeSectionRect,
    activeSelectionContainerRect,
    activeSelectionPageRect,
    activeSelectionRect,
    askModalVisible,
    enabled,
    guestTutorAssistantLabel,
    guidedTutorTarget,
    homeOnboardingEligibleContentId: HOME_ONBOARDING_ELIGIBLE_CONTENT_ID,
    homeOnboardingRecordStatus: homeOnboardingRecord?.status ?? null,
    homeOnboardingStepIndex,
    hoveredSectionAnchorId,
    isAuthenticated: authState?.isAuthenticated,
    isLoading,
    isOpen: tutorRuntime.isOpen,
    isTutorHidden,
    mounted,
    persistedSelectionPageRect,
    persistedSelectionRect,
    sectionResponsePending,
    selectionResponsePending,
    sessionContentId: sessionContext?.contentId,
    sessionSurface: sessionContext?.surface,
    tutorAnchorContext,
    tutorContent,
    tutorName,
    viewportTick,
  });

  useKangurAiTutorGuidanceCompletionEffects({
    activeSelectedText,
    highlightedSection,
    isLoading,
    isOpen: tutorRuntime.isOpen,
    isSectionGuidedMode: isSectionGuidedTutorMode,
    isSelectionGuidedMode: isSelectionGuidedTutorMode,
    sectionResponseComplete,
    sectionResponseCompleteTimeoutRef,
    sectionResponsePending,
    selectionResponseComplete,
    selectionResponseCompleteTimeoutRef,
    selectionResponsePending,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    telemetryContext,
  });

  useKangurAiTutorGuidedAuthHandoffEffect({
    guidedTutorTarget,
    loginModal,
    setGuidedTutorTarget,
  });

  const tutorPanelMotionState =
    widgetState.panelMotionState === 'animating' ? 'animating' : 'settled';

  const {
    activeFocus,
    displayFocusRect,
    isAnchoredUiMode,
    isContextualPanelAnchor,
    isMobileSheet,
    isStaticUiMode,
    selectionActionLayout,
    selectionActionStyle,
    shouldRenderSelectionAction,
  } = useKangurAiTutorFocusLayoutState({
    activeSectionRect,
    activeSelectedText,
    activeSelectionRect,
    allowSelectedTextSupport,
    guidedTutorTarget,
    hasAssignmentSummary,
    hasCurrentQuestion,
    highlightedSection,
    homeOnboardingStepIndex,
    isOpen: tutorRuntime.isOpen,
    isSelectionWithinTutorUi,
    isTutorHidden,
    motionProfile,
    panelAnchorMode,
    selectedText,
    selectionRect,
    sessionContext: {
      answerRevealed: sessionContext?.answerRevealed,
      contentId: sessionContext?.contentId,
      surface: sessionContext?.surface,
    },
    tutorAnchorContext,
    uiMode,
    viewport,
    viewportTick,
  });

  useKangurAiTutorSelectionGuidanceHandoffEffect({
    activeFocusKind: activeFocus.kind,
    activeSelectedText,
    isOpen: tutorRuntime.isOpen,
    panelMotionState: tutorPanelMotionState,
    selectionGuidanceHandoffText,
    setGuidedTutorTarget,
    setSelectionGuidanceHandoffText,
  });

  const conversationMessages = useMemo(() => {
    if (
      !selectionConversationContext ||
      !activeSelectedText ||
      selectionConversationContext.selectedText !== activeSelectedText
    ) {
      return messages;
    }

    return messages.slice(selectionConversationContext.messageStartIndex);
  }, [activeSelectedText, messages, selectionConversationContext]);

  const {
    bridgeQuickAction,
    bridgeSummaryChipLabel,
    emptyStateMessage,
    focusChipLabel: conversationFocusChipLabel,
    inputPlaceholder,
    isSectionExplainPendingMode,
    isSelectionExplainPendingMode,
    showSectionExplainCompleteState,
    showSelectionExplainCompleteState,
    visibleProactiveNudge,
    visibleQuickActions,
  } = useKangurAiTutorConversationViewState({
    activeFocus: { kind: activeFocus.kind },
    activeSelectedText,
    canSendMessages,
    contextlessDisabledPlaceholder: CONTEXTLESS_TUTOR_DISABLED_PLACEHOLDER,
    contextlessEmptyStateMessage: CONTEXTLESS_TUTOR_EMPTY_STATE_MESSAGE,
    hasAssignmentSummary,
    hasCurrentQuestion,
    highlightedSection,
    hintDepth,
    isAskModalMode,
    isLoading,
    isOpen: tutorRuntime.isOpen,
    learnerMemory,
    messages: conversationMessages,
    proactiveNudges,
    sectionResponseComplete,
    sectionResponsePending,
    selectionResponseComplete,
    selectionResponsePending,
    sessionContext: {
      answerRevealed: sessionContext?.answerRevealed,
      surface: sessionContext?.surface,
      title: sessionContext?.title,
    },
    shouldRenderContextlessTutorUi,
    tutorContent,
  });

  const bubblePlacement = useKangurAiTutorBubblePlacementState({
    activeSectionProtectedRect,
    activeSelectionProtectedRect,
    displayFocusRect,
    isMobileSheet,
    isOpen: tutorRuntime.isOpen,
    motionProfile,
    panelMeasuredHeight,
    viewport,
    visibleQuickActionCount: visibleQuickActions.length,
    visibleProactiveNudge: Boolean(visibleProactiveNudge),
  });

  const guidedFocusRect =
    guidedMode === 'home_onboarding'
      ? (homeOnboardingAnchor?.getRect() ?? null)
      : showSectionGuidanceCallout
        ? guidedSectionFocusRect
        : showSelectionGuidanceCallout
          ? guidedSelectionRect
          : (guidedTargetAnchor?.getRect() ?? guidedFallbackRect);

  const {
    guidedArrowheadTransition,
    guidedAvatarArrowhead,
    guidedAvatarArrowheadDisplayAngle,
    guidedAvatarArrowheadDisplayAngleLabel,
    guidedAvatarLayout,
    guidedAvatarStyle,
    guidedCalloutLayout,
    guidedCalloutStyle,
    guidedCalloutTransitionDuration,
    isGuidedTutorMode,
    sectionContextSpotlightStyle,
    sectionDropHighlightStyle,
    selectionContextSpotlightStyle,
    selectionSpotlightStyle,
    shouldRenderGuidedCallout,
  } = useKangurAiTutorGuidedShellState({
    activeSectionProtectedRect,
    activeSelectionProtectedRect,
    guidedFocusRect,
    guidedMode,
    guidedSelectionSpotlightRect,
    hoveredSectionProtectedRect,
    isAnonymousVisitor,
    isAskModalMode,
    isAvatarDragging,
    isContextualPanelAnchor,
    isOpen: tutorRuntime.isOpen,
    isTutorHidden,
    motionProfile,
    prefersReducedMotion: Boolean(prefersReducedMotion),
    showSectionGuidanceCallout,
    showSelectionGuidanceCallout,
    viewport,
  });

  const askModalHelperText = isAuthGuidedTutorTarget(guidedTutorTarget)
    ? tutorContent.askModal.helperAuth
    : tutorContent.askModal.helperDefault;

  const {
    canNarrateTutorText,
    compactDockedTutorPanelWidth,
    isCompactDockedTutorPanel,
    narrationObservationKey,
    panelEmptyStateMessage,
    selectedTextPreview,
    sessionSurfaceLabel,
    shouldEnableTutorNarration,
    shouldRenderAuxiliaryPanelControls,
    tutorNarrationScript,
  } = useKangurAiTutorPanelDerivedState({
    activeFocus: {
      kind: activeFocus.kind,
      label: activeFocus.label,
    },
    activeSelectedText,
    askModalHelperText,
    bubblePlacementLaunchOrigin: bubblePlacement.launchOrigin,
    bubblePlacementMode: bubblePlacement.mode,
    canStartHomeOnboardingManually,
    contextSwitchNotice,
    emptyStateMessage,
    focusChipLabel: conversationFocusChipLabel,
    guidedTutorTarget,
    highlightedSection,
    isAskModalMode,
    isGuidedTutorMode,
    isOpen: tutorRuntime.isOpen,
    isSectionExplainPendingMode,
    isSelectionExplainPendingMode,
    messages: conversationMessages,
    sessionContext: {
      contentId: sessionContext?.contentId,
      surface: sessionContext?.surface,
      title: sessionContext?.title,
    },
    showSectionExplainCompleteState,
    showSelectionExplainCompleteState,
    showSources,
    shouldRenderGuestIntroUi,
    tutorContent,
    tutorName,
    tutorNarrationObservedText,
    usageSummary,
    viewportWidth: viewport.width,
    visibleProactiveNudge,
  });

  const {
    attachedAvatarStyle,
    attachedLaunchOffset,
    avatarAnchorKind,
    avatarAttachmentSide,
    avatarPointer,
    avatarStyle,
    floatingAvatarPlacement,
    panelAvatarPlacement,
    panelOpenAnimation,
    panelTransition,
    pointerMarkerId,
    showAttachedAvatarShell,
    showFloatingAvatar,
  } = useKangurAiTutorPanelShellState({
    activeFocusKind: activeFocus.kind,
    askModalDockStyle,
    bubblePlacement,
    displayFocusRect,
    draggedAvatarPoint,
    guidedAvatarStyle,
    guidedFocusRect,
    guidedMode,
    guidedTutorTarget,
    homeOnboardingStepKind: homeOnboardingStep?.kind ?? null,
    isAnchoredUiMode,
    isAskModalMode,
    isContextualPanelAnchor,
    isGuidedTutorMode,
    isOpen: tutorRuntime.isOpen,
    isStaticUiMode,
    isTutorHidden,
    motionProfile,
    prefersReducedMotion: prefersReducedMotion ?? false,
    reducedMotionTransitions,
    showSectionGuidanceCallout,
    showSelectionGuidanceCallout,
    viewport,
  });

  useKangurAiTutorNarrationObserverEffect({
    observationKey: narrationObservationKey,
    setTutorNarrationObservedText,
    shouldEnableTutorNarration,
    tutorNarrationRootRef,
  });

  const avatarButtonClassName = cn(
    'flex h-14 w-14 cursor-pointer items-center justify-center rounded-full',
    'border-2 border-amber-900 bg-gradient-to-br from-amber-300 via-orange-400 to-orange-500',
    'shadow-[0_14px_28px_-16px_rgba(154,82,24,0.26)] hover:brightness-[1.03]',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2'
  );
  const avatarButtonStyle: CSSProperties = {
    borderColor: FLOATING_TUTOR_AVATAR_RIM_COLOR,
  };

  useKangurAiTutorTelemetryBridge({
    activeFocus,
    activeSelectedText,
    bridgeQuickActionId: bridgeQuickAction?.id ?? null,
    bubbleMode: bubblePlacement.mode,
    hintDepth,
    isOpen: tutorRuntime.isOpen,
    lastTrackedFocusKeyRef,
    lastTrackedProactiveNudgeKeyRef,
    lastTrackedQuotaKeyRef,
    motionProfile,
    motionTimeoutRef,
    prefersReducedMotion: prefersReducedMotion ?? false,
    proactiveNudges,
    sessionContext: {
      surface: sessionContext?.surface,
      contentId: sessionContext?.contentId,
      title: sessionContext?.title,
    },
    setPanelMotionState,
    telemetryContext,
    tutorSessionKey,
    usageSummary,
    visibleProactiveNudge,
  });

  const {
    handleAvatarMouseDown,
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
  } = useKangurAiTutorPanelInteractions({
    activeFocusKind: activeFocus.kind,
    activeSelectedText,
    allowSelectedTextSupport,
    bubblePlacementMode: bubblePlacement.mode,
    clearSelection,
    closeChat,
    isAskModalMode,
    isOpen: tutorRuntime.isOpen,
    isTargetWithinTutorUi,
    messageCount: messages.length,
    openChat,
    persistSelectionGeometry,
    selectedText,
    selectionRect,
    setHighlightedText,
    setInputValue,
    telemetryContext,
    widgetState: {
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
    },
  });

  const {
    handleGuestIntroAccept,
    handleGuestIntroCreateAccount,
    handleGuestIntroDismiss,
    handleGuestIntroHelpClose,
    handleGuestIntroLogin,
    startGuidedGuestLogin,
  } = useKangurAiTutorGuestIntroFlow({
    authState,
    enabled,
    guestIntroCheckStartedRef,
    guestIntroHelpVisible,
    guestIntroLocalSuppressionTrackedRef,
    guestIntroRecord,
    guestIntroShownForCurrentEntryRef,
    guestIntroVisible,
    handleCloseChat,
    handleOpenChat,
    isOpen: tutorRuntime.isOpen,
    isTutorHidden,
    mounted,
    selectionExplainTimeoutRef,
    setGuidedTutorTarget,
    setGuestIntroHelpVisible,
    setGuestIntroRecord,
    setGuestIntroVisible,
    setHasNewMessage,
    shouldRepeatGuestIntroOnEntry,
    suppressAvatarClickRef,
  });

  const {
    focusSectionRect,
    focusSelectionPageRect,
    startGuidedSectionExplanation,
    startGuidedSelectionExplanation,
  } = useKangurAiTutorGuidedFlow({
    activeSelectionPageRect,
    clearSelection,
    handleOpenChat,
    motionProfile,
    prefersReducedMotion: Boolean(prefersReducedMotion),
    resetAskModalState,
    selectionExplainTimeoutRef,
    sendMessage,
    setDismissedSelectedText,
    setGuidedTutorTarget,
    setHasNewMessage,
    setHighlightedSection,
    setHighlightedText,
    setHoveredSectionAnchorId,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionRect,
    setSelectionGuidanceHandoffText,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionContextSpotlightTick,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    setViewportTick,
    suppressAvatarClickRef,
    telemetryContext,
    tutorContent,
    viewportHeight: viewport.height,
  });

  const {
    handleHomeOnboardingAdvance,
    handleHomeOnboardingBack,
    handleHomeOnboardingFinishEarly,
    handleStartHomeOnboarding,
  } = useKangurAiTutorHomeOnboardingFlow({
    canStartHomeOnboardingManually,
    closeChat,
    guidedTutorTarget,
    homeOnboardingEligibleContentId: HOME_ONBOARDING_ELIGIBLE_CONTENT_ID,
    homeOnboardingMode,
    homeOnboardingRecord,
    homeOnboardingShownForCurrentEntryRef,
    homeOnboardingStep,
    homeOnboardingStepIndex,
    homeOnboardingStepsLength: homeOnboardingSteps.length,
    isEligibleForHomeOnboarding,
    sessionContentId: sessionContext?.contentId,
    setDraggedAvatarPoint,
    setHomeOnboardingRecord,
    setHomeOnboardingStepIndex,
    shouldRepeatHomeOnboardingOnEntry,
  });

  const {
    handleAskAbout,
    handleAvatarClick,
    handleCloseGuidedCallout,
  } = useKangurAiTutorAvatarShellActions({
    closeChat,
    guestIntroHelpVisible,
    guestIntroVisible,
    guidedMode,
    guidedTutorTarget,
    handleCloseChat,
    handleCloseGuestIntroCard,
    handleCloseLauncherPrompt,
    handleHomeOnboardingFinishEarly,
    handleOpenChat,
    homeOnboardingStepIndex,
    isOpen: tutorRuntime.isOpen,
    launcherPromptVisible,
    persistSelectionContext,
    selectionExplainTimeoutRef,
    setDraggedAvatarPoint,
    setGuidedTutorTarget,
    setHighlightedSection,
    setHoveredSectionAnchorId,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    startGuidedSelectionExplanation,
    suppressAvatarClickRef,
  });

  const {
    handleFloatingAvatarPointerCancel,
    handleFloatingAvatarPointerDown,
    handleFloatingAvatarPointerMove,
    handleFloatingAvatarPointerUp,
  } = useKangurAiTutorAvatarDrag({
    avatarDragStateRef,
    draggedAvatarPoint,
    guidedTutorTarget,
    homeOnboardingStepIndex,
    hoveredSectionAnchor,
    isAvatarDragging,
    isOpen: tutorRuntime.isOpen,
    selectionExplainTimeoutRef,
    setDraggedAvatarPoint,
    setGuidedTutorTarget,
    setHomeOnboardingStepIndex,
    setHoveredSectionAnchorId,
    setIsAvatarDragging,
    startGuidedSectionExplanation,
    suppressAvatarClickRef,
    tutorAnchorContext,
    viewport,
  });

  const {
    handleDetachHighlightedSection,
    handleDetachSelectedFragment,
    handleFocusHighlightedSection,
    handleFocusSelectedFragment,
    handleFollowUpClick,
    handleKeyDown,
    handleMessageFeedback,
    handleQuickAction,
    handleSend,
  } = useKangurAiTutorPanelActions({
    activeFocus,
    activeSectionRect,
    activeSelectedText,
    activeSelectionPageRect,
    answerRevealed: sessionContext?.answerRevealed,
    bridgeQuickActionId: bridgeQuickAction?.id ?? null,
    canSendMessages,
    clearSelection,
    focusSectionRect,
    focusSelectionPageRect,
    getCurrentTutorLocation,
    getInteractionIntent,
    highlightedSection,
    inputValue,
    isAnonymousVisitor,
    isLoading,
    messageCount: messages.length,
    normalizeConversationFocusKind,
    persistSelectionGeometry,
    resolveGuestLoginGuidanceIntent: resolveGuestLoginGuidanceIntentForContent,
    resolveTutorFollowUpLocation,
    setHighlightedText,
    sendMessage,
    startGuidedGuestLogin,
    telemetryContext,
    tutorSessionKey,
    widgetState: {
      setDismissedSelectedText,
      setHighlightedSection,
      setInputValue,
      setMessageFeedbackByKey,
      setPersistedSelectionContainerRect,
      setPersistedSelectionPageRect,
      setPersistedSelectionRect,
      setSelectionConversationContext,
      setSectionResponseComplete,
      setSectionResponsePending,
      setSelectionResponseComplete,
    },
  });

  const { portalContentValue } = useKangurAiTutorPortalViewModel({
    activeFocus,
    activeSectionRect,
    activeSelectedText,
    activeSelectionPageRect,
    askModalHelperText,
    avatarAnchorKind,
    avatarAttachmentSide,
    avatarButtonClassName,
    avatarButtonStyle,
    avatarPointer,
    avatarStyle,
    attachedAvatarStyle,
    attachedLaunchOffset,
    basePath,
    bridgeQuickAction,
    bridgeSummaryChipLabel,
    bubblePlacement,
    canNarrateTutorText,
    canSendMessages,
    canStartHomeOnboardingManually,
    compactDockedTutorPanelWidth,
    emptyStateMessage,
    floatingAvatarPlacement,
    focusChipLabel: conversationFocusChipLabel,
    guestIntroHelpVisible,
    guestTutorAssistantLabel,
    guidedArrowheadTransition,
    guidedAvatarArrowhead,
    guidedAvatarArrowheadDisplayAngle,
    guidedAvatarArrowheadDisplayAngleLabel,
    guidedAvatarLayout,
    guidedCalloutDetail,
    guidedCalloutHeaderLabel,
    guidedCalloutKey,
    guidedCalloutLayout,
    guidedCalloutStepLabel,
    guidedCalloutStyle,
    guidedCalloutTestId,
    guidedCalloutTitle,
    guidedCalloutTransitionDuration,
    guidedMode,
    guidedSelectionPreview,
    guidedTutorTarget,
    handleAskAbout,
    handleAvatarClick,
    handleAvatarMouseDown,
    handleCloseChat,
    handleCloseGuestIntroCard,
    handleCloseGuidedCallout,
    handleDetachHighlightedSection,
    handleDetachSelectedFragment,
    handleDisableTutor,
    handleFloatingAvatarPointerCancel,
    handleFloatingAvatarPointerDown,
    handleFloatingAvatarPointerMove,
    handleFloatingAvatarPointerUp,
    handleFocusHighlightedSection,
    handleFocusSelectedFragment,
    handleFollowUpClick,
    handleGuestIntroAccept,
    handleGuestIntroCreateAccount,
    handleGuestIntroDismiss,
    handleGuestIntroHelpClose,
    handleGuestIntroLogin,
    handleHomeOnboardingAdvance,
    handleHomeOnboardingBack,
    handleHomeOnboardingFinishEarly,
    handleKeyDown,
    handleMessageFeedback,
    handlePanelBackdropClose,
    handlePanelHeaderClose,
    handleQuickAction,
    handleSelectionActionMouseDown,
    handleSend,
    handleStartHomeOnboarding,
    homeOnboardingReplayLabel,
    homeOnboardingStep,
    inputPlaceholder,
    isAnonymousVisitor,
    isAskModalMode,
    isCompactDockedTutorPanel,
    isGuidedTutorMode,
    isLoading,
    isOpen: tutorRuntime.isOpen,
    isSectionExplainPendingMode,
    isSelectionExplainPendingMode,
    isTutorHidden,
    isUsageLoading,
    messages: conversationMessages,
    motionProfile,
    narratorSettings,
    panelAvatarPlacement,
    panelEmptyStateMessage,
    panelOpenAnimation,
    panelTransition,
    pointerMarkerId,
    prefersReducedMotion,
    reducedMotionTransitions,
    remainingMessages,
    sectionContextSpotlightStyle,
    sectionDropHighlightStyle,
    sectionGuidanceLabel,
    sectionResponsePendingKind,
    selectedTextPreview,
    selectionActionLayout,
    selectionActionStyle,
    selectionContextSpotlightStyle,
    selectionSpotlightStyle,
    sessionSurfaceLabel,
    shouldRenderAuxiliaryPanelControls,
    shouldRenderGuestIntroUi,
    shouldRenderGuidedCallout,
    shouldRenderSelectionAction,
    shouldRepeatGuestIntroOnEntry,
    showAttachedAvatarShell,
    showFloatingAvatar,
    showSectionExplainCompleteState,
    showSectionGuidanceCallout,
    showSelectionExplainCompleteState,
    showSelectionGuidanceCallout,
    showSources,
    tutorContent,
    tutorNarrationScript,
    tutorNarratorContextRegistry,
    tutorSessionKey,
    uiMode,
    usageSummary,
    viewport,
    visibleProactiveNudge,
    visibleQuickActions,
  });

  const shouldRender =
    !(
      (!enabled &&
        !shouldRenderGuestIntroUi &&
        !shouldRenderContextlessTutorUi &&
        !isGuidedTutorMode &&
        !askModalVisible &&
        !isAnonymousVisitor) ||
      !mounted
    );

  return {
    portalContentValue,
    shouldRender,
  };
}
