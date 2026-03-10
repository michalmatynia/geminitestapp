'use client';

import { useMemo } from 'react';

import type { KangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';

import { getGuestIntroPanelStyle } from './KangurAiTutorWidget.storage';


import type { KangurAiTutorPanelBodyContextValue } from './KangurAiTutorPanelBody.context';
import type { KangurAiTutorPortalContextValue } from './KangurAiTutorPortal.context';
import type { TutorMotionProfile, TutorQuickAction } from './KangurAiTutorWidget.shared';
import type {
  GuidedTutorTarget,
  TutorHomeOnboardingStep,
} from './KangurAiTutorWidget.types';

type GuidedMode = KangurAiTutorPortalContextValue['guidedCallout']['mode'];
type ReducedMotionTransitions = KangurAiTutorPortalContextValue['avatar']['reducedMotionTransitions'];

type UseKangurAiTutorPortalViewModelInput = {
  activeFocus: KangurAiTutorPanelBodyContextValue['activeFocus'];
  activeSectionRect: KangurAiTutorPanelBodyContextValue['activeSectionRect'];
  activeSelectedText: KangurAiTutorPanelBodyContextValue['activeSelectedText'];
  activeSelectionPageRect: KangurAiTutorPanelBodyContextValue['activeSelectionPageRect'];
  askModalHelperText: KangurAiTutorPanelBodyContextValue['askModalHelperText'];
  avatarAnchorKind: KangurAiTutorPortalContextValue['avatar']['avatarAnchorKind'];
  avatarAttachmentSide: KangurAiTutorPortalContextValue['panel']['avatarAttachmentSide'];
  avatarButtonClassName: KangurAiTutorPortalContextValue['avatar']['avatarButtonClassName'];
  avatarButtonStyle: KangurAiTutorPortalContextValue['avatar']['avatarButtonStyle'];
  avatarPointer: KangurAiTutorPortalContextValue['panel']['avatarPointer'];
  avatarStyle: KangurAiTutorPortalContextValue['avatar']['avatarStyle'];
  attachedAvatarStyle: KangurAiTutorPortalContextValue['panel']['attachedAvatarStyle'];
  attachedLaunchOffset: KangurAiTutorPortalContextValue['panel']['attachedLaunchOffset'];
  basePath: KangurAiTutorPanelBodyContextValue['basePath'];
  bridgeQuickAction: TutorQuickAction | null;
  bridgeSummaryChipLabel: KangurAiTutorPanelBodyContextValue['bridgeSummaryChipLabel'];
  bubblePlacement: {
    launchOrigin: KangurAiTutorPortalContextValue['panel']['bubbleLaunchOrigin'];
    mode: KangurAiTutorPortalContextValue['panel']['bubbleMode'];
    strategy: KangurAiTutorPortalContextValue['panel']['bubbleStrategy'];
    style: KangurAiTutorPortalContextValue['panel']['bubbleStyle'];
    tailPlacement: KangurAiTutorPortalContextValue['panel']['bubbleTailPlacement'];
    width?: KangurAiTutorPortalContextValue['panel']['bubbleWidth'];
  };
  canNarrateTutorText: KangurAiTutorPanelBodyContextValue['canNarrateTutorText'];
  canSendMessages: KangurAiTutorPanelBodyContextValue['canSendMessages'];
  canStartHomeOnboardingManually: KangurAiTutorPanelBodyContextValue['canStartHomeOnboardingManually'];
  compactDockedTutorPanelWidth: KangurAiTutorPortalContextValue['panel']['compactDockedTutorPanelWidth'];
  emptyStateMessage: KangurAiTutorPanelBodyContextValue['emptyStateMessage'];
  floatingAvatarPlacement: KangurAiTutorPortalContextValue['avatar']['floatingAvatarPlacement'];
  focusChipLabel: KangurAiTutorPanelBodyContextValue['focusChipLabel'];
  guestIntroHelpVisible: boolean;
  guestTutorAssistantLabel: string;
  guidedArrowheadTransition: KangurAiTutorPortalContextValue['avatar']['guidedArrowheadTransition'];
  guidedAvatarArrowhead: KangurAiTutorPortalContextValue['avatar']['guidedAvatarArrowhead'];
  guidedAvatarArrowheadDisplayAngle: KangurAiTutorPortalContextValue['avatar']['guidedAvatarArrowheadDisplayAngle'];
  guidedAvatarArrowheadDisplayAngleLabel: KangurAiTutorPortalContextValue['avatar']['guidedAvatarArrowheadDisplayAngleLabel'];
  guidedAvatarLayout: {
    placement: KangurAiTutorPortalContextValue['avatar']['guidedAvatarPlacement'];
  } | null;
  guidedCalloutDetail: string | null;
  guidedCalloutHeaderLabel: string | null;
  guidedCalloutKey: string;
  guidedCalloutLayout: {
    placement: KangurAiTutorPortalContextValue['guidedCallout']['placement'];
  } | null;
  guidedCalloutStepLabel: string | null;
  guidedCalloutStyle: KangurAiTutorPortalContextValue['guidedCallout']['style'];
  guidedCalloutTestId: string;
  guidedCalloutTitle: string | null;
  guidedCalloutTransitionDuration: number;
  guidedMode: GuidedMode;
  guidedSelectionPreview: KangurAiTutorPortalContextValue['guidedCallout']['selectionPreview'];
  guidedTutorTarget: GuidedTutorTarget | null;
  handleAskAbout: KangurAiTutorPortalContextValue['selectionAction']['onAskAbout'];
  handleAvatarClick: KangurAiTutorPortalContextValue['avatar']['onClick'];
  handleAvatarMouseDown: KangurAiTutorPortalContextValue['avatar']['onMouseDown'];
  handleCloseChat: (reason: 'toggle' | 'header' | 'outside') => void;
  handleCloseGuestIntroCard: KangurAiTutorPortalContextValue['guestIntro']['onClose'];
  handleCloseGuidedCallout: KangurAiTutorPortalContextValue['guidedCallout']['onClose'];
  handleDetachHighlightedSection: KangurAiTutorPanelBodyContextValue['handleDetachHighlightedSection'];
  handleDetachSelectedFragment: KangurAiTutorPanelBodyContextValue['handleDetachSelectedFragment'];
  handleDisableTutor: KangurAiTutorPortalContextValue['panel']['onDisableTutor'];
  handleFloatingAvatarPointerCancel: KangurAiTutorPortalContextValue['avatar']['onPointerCancel'];
  handleFloatingAvatarPointerDown: KangurAiTutorPortalContextValue['avatar']['onPointerDown'];
  handleFloatingAvatarPointerMove: KangurAiTutorPortalContextValue['avatar']['onPointerMove'];
  handleFloatingAvatarPointerUp: KangurAiTutorPortalContextValue['avatar']['onPointerUp'];
  handleFocusHighlightedSection: KangurAiTutorPanelBodyContextValue['handleFocusHighlightedSection'];
  handleFocusSelectedFragment: KangurAiTutorPanelBodyContextValue['handleFocusSelectedFragment'];
  handleFollowUpClick: KangurAiTutorPanelBodyContextValue['handleFollowUpClick'];
  handleGuestIntroAccept: KangurAiTutorPortalContextValue['guestIntro']['onAccept'];
  handleGuestIntroCreateAccount: KangurAiTutorPortalContextValue['guestIntro']['onCreateAccount'];
  handleGuestIntroDismiss: KangurAiTutorPortalContextValue['guestIntro']['onDismiss'];
  handleGuestIntroHelpClose: KangurAiTutorPortalContextValue['guestIntro']['onHelpClose'];
  handleGuestIntroLogin: KangurAiTutorPortalContextValue['guestIntro']['onLogin'];
  handleHomeOnboardingAdvance: KangurAiTutorPortalContextValue['guidedCallout']['onAdvanceHomeOnboarding'];
  handleHomeOnboardingBack: KangurAiTutorPortalContextValue['guidedCallout']['onBackHomeOnboarding'];
  handleHomeOnboardingFinishEarly: KangurAiTutorPortalContextValue['guidedCallout']['onFinishHomeOnboarding'];
  handleKeyDown: KangurAiTutorPanelBodyContextValue['handleKeyDown'];
  handleMessageFeedback: KangurAiTutorPanelBodyContextValue['handleMessageFeedback'];
  handlePanelBackdropClose: KangurAiTutorPortalContextValue['panel']['onBackdropClose'];
  handlePanelHeaderClose: KangurAiTutorPortalContextValue['panel']['onClose'];
  handleQuickAction: KangurAiTutorPanelBodyContextValue['handleQuickAction'];
  handleSelectionActionMouseDown: KangurAiTutorPortalContextValue['selectionAction']['onSelectionActionMouseDown'];
  handleSend: KangurAiTutorPanelBodyContextValue['handleSend'];
  handleStartHomeOnboarding: KangurAiTutorPanelBodyContextValue['handleStartHomeOnboarding'];
  homeOnboardingReplayLabel: KangurAiTutorPanelBodyContextValue['homeOnboardingReplayLabel'];
  homeOnboardingStep: TutorHomeOnboardingStep | null;
  inputPlaceholder: KangurAiTutorPanelBodyContextValue['inputPlaceholder'];
  isAnonymousVisitor: KangurAiTutorPortalContextValue['guestIntro']['isAnonymousVisitor'];
  isAskModalMode: KangurAiTutorPanelBodyContextValue['isAskModalMode'];
  isCompactDockedTutorPanel: KangurAiTutorPortalContextValue['panel']['isCompactDockedTutorPanel'];
  isGuidedTutorMode: KangurAiTutorPortalContextValue['avatar']['isGuidedTutorMode'];
  isLoading: KangurAiTutorPanelBodyContextValue['isLoading'];
  isOpen: KangurAiTutorPortalContextValue['avatar']['isOpen'];
  isSectionExplainPendingMode: KangurAiTutorPanelBodyContextValue['isSectionExplainPendingMode'];
  isSelectionExplainPendingMode: KangurAiTutorPanelBodyContextValue['isSelectionExplainPendingMode'];
  isTutorHidden: KangurAiTutorPortalContextValue['panel']['isTutorHidden'];
  isUsageLoading: KangurAiTutorPanelBodyContextValue['isUsageLoading'];
  messages: KangurAiTutorPanelBodyContextValue['messages'];
  motionProfile: TutorMotionProfile;
  narratorSettings: KangurAiTutorPanelBodyContextValue['narratorSettings'];
  panelAvatarPlacement: KangurAiTutorPortalContextValue['panel']['panelAvatarPlacement'];
  panelEmptyStateMessage: KangurAiTutorPanelBodyContextValue['panelEmptyStateMessage'];
  panelOpenAnimation: KangurAiTutorPortalContextValue['panel']['panelOpenAnimation'];
  panelTransition: KangurAiTutorPortalContextValue['panel']['panelTransition'];
  pointerMarkerId: KangurAiTutorPortalContextValue['panel']['pointerMarkerId'];
  prefersReducedMotion: boolean | undefined;
  reducedMotionTransitions: ReducedMotionTransitions;
  remainingMessages: KangurAiTutorPanelBodyContextValue['remainingMessages'];
  sectionContextSpotlightStyle: KangurAiTutorPortalContextValue['spotlights']['sectionContextSpotlightStyle'];
  sectionDropHighlightStyle: KangurAiTutorPortalContextValue['spotlights']['sectionDropHighlightStyle'];
  sectionGuidanceLabel: KangurAiTutorPortalContextValue['guidedCallout']['sectionGuidanceLabel'];
  sectionResponsePendingKind: KangurAiTutorPortalContextValue['guidedCallout']['sectionResponsePendingKind'];
  selectedTextPreview: KangurAiTutorPanelBodyContextValue['selectedTextPreview'];
  selectionActionLayout: {
    placement: KangurAiTutorPortalContextValue['selectionAction']['placement'];
  } | null;
  selectionActionStyle: KangurAiTutorPortalContextValue['selectionAction']['style'];
  selectionContextSpotlightStyle: KangurAiTutorPortalContextValue['spotlights']['selectionContextSpotlightStyle'];
  selectionSpotlightStyle: KangurAiTutorPortalContextValue['spotlights']['selectionSpotlightStyle'];
  sessionSurfaceLabel: KangurAiTutorPortalContextValue['panel']['sessionSurfaceLabel'];
  shouldRenderAuxiliaryPanelControls: KangurAiTutorPanelBodyContextValue['shouldRenderAuxiliaryPanelControls'];
  shouldRenderGuestIntroUi: KangurAiTutorPortalContextValue['panel']['shouldRenderGuestIntroUi'];
  shouldRenderGuidedCallout: KangurAiTutorPortalContextValue['guidedCallout']['shouldRender'];
  shouldRenderSelectionAction: KangurAiTutorPortalContextValue['selectionAction']['shouldRender'];
  shouldRepeatGuestIntroOnEntry: boolean;
  showAttachedAvatarShell: KangurAiTutorPortalContextValue['panel']['showAttachedAvatarShell'];
  showFloatingAvatar: KangurAiTutorPortalContextValue['avatar']['showFloatingAvatar'];
  showSectionExplainCompleteState: KangurAiTutorPanelBodyContextValue['showSectionExplainCompleteState'];
  showSectionGuidanceCallout: KangurAiTutorPortalContextValue['guidedCallout']['showSectionGuidanceCallout'];
  showSelectionExplainCompleteState: KangurAiTutorPanelBodyContextValue['showSelectionExplainCompleteState'];
  showSelectionGuidanceCallout: KangurAiTutorPortalContextValue['guidedCallout']['showSelectionGuidanceCallout'];
  showSources: KangurAiTutorPanelBodyContextValue['showSources'];
  suppressPanelSurface: KangurAiTutorPortalContextValue['panel']['suppressPanelSurface'];
  tutorContent: KangurAiTutorContent;
  tutorNarrationScript: KangurAiTutorPanelBodyContextValue['tutorNarrationScript'];
  tutorNarratorContextRegistry: KangurAiTutorPanelBodyContextValue['tutorNarratorContextRegistry'];
  tutorSessionKey: KangurAiTutorPanelBodyContextValue['tutorSessionKey'];
  uiMode: string;
  usageSummary: KangurAiTutorPanelBodyContextValue['usageSummary'];
  viewport: {
    height: number;
    width: number;
  };
  visibleProactiveNudge: KangurAiTutorPanelBodyContextValue['visibleProactiveNudge'];
  visibleQuickActions: KangurAiTutorPanelBodyContextValue['visibleQuickActions'];
};

export function useKangurAiTutorPortalViewModel(
  input: UseKangurAiTutorPortalViewModelInput
): {
  panelBodyContextValue: KangurAiTutorPanelBodyContextValue;
  portalContentValue: KangurAiTutorPortalContextValue;
} {
  const prefersReducedMotionEnabled = input.prefersReducedMotion ?? false;
  const isGuidedAvatarMode =
    input.isGuidedTutorMode ||
    input.showSelectionGuidanceCallout ||
    input.showSectionGuidanceCallout;

  const guestIntroHeadline = input.guestIntroHelpVisible
    ? input.tutorContent.guestIntro.help.headline
    : input.tutorContent.guestIntro.initial.headline;
  const guestIntroDescription = input.guestIntroHelpVisible
    ? input.tutorContent.guestIntro.help.description
    : input.shouldRepeatGuestIntroOnEntry
      ? input.tutorContent.guestIntro.repeated.description
      : input.tutorContent.guestIntro.initial.description;

  const panelBodyContextValue = useMemo<KangurAiTutorPanelBodyContextValue>(
    () => ({
      activeFocus: input.activeFocus,
      activeSectionRect: input.activeSectionRect,
      activeSelectedText: input.activeSelectedText,
      activeSelectionPageRect: input.activeSelectionPageRect,
      askModalHelperText: input.askModalHelperText,
      basePath: input.basePath,
      bridgeQuickActionId: input.bridgeQuickAction?.id ?? null,
      bridgeSummaryChipLabel: input.bridgeSummaryChipLabel,
      canNarrateTutorText: input.canNarrateTutorText,
      canSendMessages: input.canSendMessages,
      canStartHomeOnboardingManually: input.canStartHomeOnboardingManually,
      emptyStateMessage: input.emptyStateMessage,
      focusChipLabel: input.focusChipLabel,
      handleDetachHighlightedSection: input.handleDetachHighlightedSection,
      handleDetachSelectedFragment: input.handleDetachSelectedFragment,
      handleFocusHighlightedSection: input.handleFocusHighlightedSection,
      handleFocusSelectedFragment: input.handleFocusSelectedFragment,
      handleFollowUpClick: input.handleFollowUpClick,
      handleKeyDown: input.handleKeyDown,
      handleMessageFeedback: input.handleMessageFeedback,
      handleQuickAction: input.handleQuickAction,
      handleSend: input.handleSend,
      handleStartHomeOnboarding: input.handleStartHomeOnboarding,
      homeOnboardingReplayLabel: input.homeOnboardingReplayLabel,
      inputPlaceholder: input.inputPlaceholder,
      isAskModalMode: input.isAskModalMode,
      isLoading: input.isLoading,
      isSectionExplainPendingMode: input.isSectionExplainPendingMode,
      isSelectionExplainPendingMode: input.isSelectionExplainPendingMode,
      isUsageLoading: input.isUsageLoading,
      messages: input.messages,
      narratorSettings: input.narratorSettings,
      panelEmptyStateMessage: input.panelEmptyStateMessage,
      remainingMessages: input.remainingMessages,
      selectedTextPreview: input.selectedTextPreview,
      shouldRenderAuxiliaryPanelControls: input.shouldRenderAuxiliaryPanelControls,
      showSectionExplainCompleteState: input.showSectionExplainCompleteState,
      showSelectionExplainCompleteState: input.showSelectionExplainCompleteState,
      showSources: input.showSources,
      tutorNarrationScript: input.tutorNarrationScript,
      tutorNarratorContextRegistry: input.tutorNarratorContextRegistry,
      tutorSessionKey: input.tutorSessionKey,
      usageSummary: input.usageSummary,
      visibleProactiveNudge: input.visibleProactiveNudge,
      visibleQuickActions: input.visibleQuickActions,
    }),
    [
      input.activeFocus,
      input.activeSectionRect,
      input.activeSelectedText,
      input.activeSelectionPageRect,
      input.askModalHelperText,
      input.basePath,
      input.bridgeQuickAction,
      input.bridgeSummaryChipLabel,
      input.canNarrateTutorText,
      input.canSendMessages,
      input.canStartHomeOnboardingManually,
      input.emptyStateMessage,
      input.focusChipLabel,
      input.handleDetachHighlightedSection,
      input.handleDetachSelectedFragment,
      input.handleFocusHighlightedSection,
      input.handleFocusSelectedFragment,
      input.handleFollowUpClick,
      input.handleKeyDown,
      input.handleMessageFeedback,
      input.handleQuickAction,
      input.handleSend,
      input.handleStartHomeOnboarding,
      input.homeOnboardingReplayLabel,
      input.inputPlaceholder,
      input.isAskModalMode,
      input.isLoading,
      input.isSectionExplainPendingMode,
      input.isSelectionExplainPendingMode,
      input.isUsageLoading,
      input.messages,
      input.narratorSettings,
      input.panelEmptyStateMessage,
      input.remainingMessages,
      input.selectedTextPreview,
      input.shouldRenderAuxiliaryPanelControls,
      input.showSectionExplainCompleteState,
      input.showSelectionExplainCompleteState,
      input.showSources,
      input.tutorNarrationScript,
      input.tutorNarratorContextRegistry,
      input.tutorSessionKey,
      input.usageSummary,
      input.visibleProactiveNudge,
      input.visibleQuickActions,
    ]
  );

  const portalContentValue = useMemo<KangurAiTutorPortalContextValue>(
    () => ({
      avatar: {
        ariaLabel: input.isOpen
          ? input.tutorContent.common.closeTutorAria
          : input.tutorContent.common.openTutorAria,
        avatarAnchorKind: input.avatarAnchorKind,
        avatarButtonClassName: input.avatarButtonClassName,
        avatarButtonStyle: input.avatarButtonStyle,
        avatarStyle: input.avatarStyle,
        floatingAvatarPlacement: input.floatingAvatarPlacement,
        guidedArrowheadTransition: input.guidedArrowheadTransition,
        guidedAvatarArrowhead: input.guidedAvatarArrowhead,
        guidedAvatarArrowheadDisplayAngle: input.guidedAvatarArrowheadDisplayAngle,
        guidedAvatarArrowheadDisplayAngleLabel: input.guidedAvatarArrowheadDisplayAngleLabel,
        guidedAvatarPlacement: input.guidedAvatarLayout?.placement ?? 'dock',
        guidedTargetKind:
          input.guidedMode === 'home_onboarding'
            ? (input.homeOnboardingStep?.kind ?? 'none')
            : input.showSelectionGuidanceCallout
              ? 'selection_excerpt'
              : input.showSectionGuidanceCallout
                ? (input.sectionResponsePendingKind ?? input.guidedTutorTarget?.kind ?? 'none')
                : (input.guidedTutorTarget?.kind ?? 'none'),
        isAskModalMode: input.isAskModalMode,
        isGuidedTutorMode: isGuidedAvatarMode,
        isOpen: input.isOpen,
        motionProfile: input.motionProfile,
        onClick: input.handleAvatarClick,
        onMouseDown: input.handleAvatarMouseDown,
        onPointerCancel: input.handleFloatingAvatarPointerCancel,
        onPointerDown: input.handleFloatingAvatarPointerDown,
        onPointerMove: input.handleFloatingAvatarPointerMove,
        onPointerUp: input.handleFloatingAvatarPointerUp,
        prefersReducedMotion: prefersReducedMotionEnabled,
        reducedMotionTransitions: input.reducedMotionTransitions,
        rimColor: '#78350f',
        showFloatingAvatar: input.showFloatingAvatar,
        uiMode: input.uiMode,
      },
      guestIntro: {
        guestIntroDescription,
        guestIntroHeadline,
        guestTutorLabel: input.guestTutorAssistantLabel,
        isAnonymousVisitor: input.isAnonymousVisitor,
        panelStyle: getGuestIntroPanelStyle(input.viewport),
        prefersReducedMotion: prefersReducedMotionEnabled,
        shouldRender: input.shouldRenderGuestIntroUi,
        onAccept: input.handleGuestIntroAccept,
        onClose: input.handleCloseGuestIntroCard,
        onCreateAccount: input.handleGuestIntroCreateAccount,
        onDismiss: input.handleGuestIntroDismiss,
        onHelpClose: input.handleGuestIntroHelpClose,
        onLogin: input.handleGuestIntroLogin,
      },
      guidedCallout: {
        calloutKey: input.guidedCalloutKey,
        calloutTestId: input.guidedCalloutTestId,
        detail: input.guidedCalloutDetail ?? '',
        headerLabel: input.guidedCalloutHeaderLabel ?? '',
        mode: input.guidedMode,
        onAdvanceHomeOnboarding: input.handleHomeOnboardingAdvance,
        onBackHomeOnboarding: input.handleHomeOnboardingBack,
        onClose: input.handleCloseGuidedCallout,
        onFinishHomeOnboarding: input.handleHomeOnboardingFinishEarly,
        placement: input.guidedCalloutLayout?.placement ?? 'top',
        prefersReducedMotion: prefersReducedMotionEnabled,
        reducedMotionTransitions: input.reducedMotionTransitions,
        sectionGuidanceLabel: input.sectionGuidanceLabel,
        sectionResponsePendingKind: input.sectionResponsePendingKind,
        selectionPreview: input.guidedSelectionPreview,
        shouldRender: input.shouldRenderGuidedCallout,
        showSectionGuidanceCallout: input.showSectionGuidanceCallout,
        showSelectionGuidanceCallout: input.showSelectionGuidanceCallout,
        stepLabel: input.guidedCalloutStepLabel,
        style: input.guidedCalloutStyle,
        title: input.guidedCalloutTitle ?? '',
        transitionDuration: input.guidedCalloutTransitionDuration,
        transitionEase: [...input.motionProfile.guidedAvatarTransition.ease] as [
          number,
          number,
          number,
          number,
        ],
      },
      panel: {
        attachedAvatarStyle: input.attachedAvatarStyle,
        attachedLaunchOffset: input.attachedLaunchOffset,
        avatarAnchorKind: input.avatarAnchorKind,
        avatarAttachmentSide: input.avatarAttachmentSide,
        avatarButtonClassName: input.avatarButtonClassName,
        avatarPointer: input.avatarPointer,
        bubbleLaunchOrigin: input.bubblePlacement.launchOrigin,
        bubbleMode: input.bubblePlacement.mode,
        bubbleStrategy: input.bubblePlacement.strategy,
        bubbleStyle: input.bubblePlacement.style,
        bubbleTailPlacement: input.bubblePlacement.tailPlacement,
        bubbleWidth: input.bubblePlacement.width,
        compactDockedTutorPanelWidth: input.compactDockedTutorPanelWidth,
        isAskModalMode: input.isAskModalMode,
        isCompactDockedTutorPanel: input.isCompactDockedTutorPanel,
        isGuidedTutorMode: input.isGuidedTutorMode,
        isOpen: input.isOpen,
        isTutorHidden: input.isTutorHidden,
        motionProfile: input.motionProfile,
        onAttachedAvatarClick: () => input.handleCloseChat('toggle'),
        onBackdropClose: input.handlePanelBackdropClose,
        onClose: input.handlePanelHeaderClose,
        onDisableTutor: input.handleDisableTutor,
        panelAvatarPlacement: input.panelAvatarPlacement,
        panelBodyContextValue,
        panelEmptyStateMessage: input.panelEmptyStateMessage,
        panelOpenAnimation: input.panelOpenAnimation,
        panelTransition: input.panelTransition,
        pointerMarkerId: input.pointerMarkerId,
        prefersReducedMotion: prefersReducedMotionEnabled,
        reducedMotionTransitions: input.reducedMotionTransitions,
        sessionSurfaceLabel: input.sessionSurfaceLabel,
        shouldRenderGuestIntroUi: input.shouldRenderGuestIntroUi,
        showAttachedAvatarShell: input.showAttachedAvatarShell,
        suppressPanelSurface: input.suppressPanelSurface,
        uiMode: input.uiMode,
      },
      selectionAction: {
        onAskAbout: input.handleAskAbout,
        onSelectionActionMouseDown: input.handleSelectionActionMouseDown,
        placement: input.selectionActionLayout?.placement ?? 'top',
        prefersReducedMotion: prefersReducedMotionEnabled,
        shouldRender: input.shouldRenderSelectionAction,
        style: input.selectionActionStyle,
      },
      spotlights: {
        guidedMode: input.guidedMode,
        prefersReducedMotion: prefersReducedMotionEnabled,
        reducedMotionTransitions: input.reducedMotionTransitions,
        sectionContextSpotlightStyle: input.sectionContextSpotlightStyle,
        sectionDropHighlightStyle: input.sectionDropHighlightStyle,
        selectionContextSpotlightStyle: input.selectionContextSpotlightStyle,
        selectionSpotlightStyle: input.selectionSpotlightStyle,
      },
    }),
    [
      guestIntroDescription,
      guestIntroHeadline,
      input.attachedAvatarStyle,
      input.attachedLaunchOffset,
      input.avatarAnchorKind,
      input.avatarAttachmentSide,
      input.avatarButtonClassName,
      input.avatarButtonStyle,
      input.avatarPointer,
      input.avatarStyle,
      input.bubblePlacement,
      input.compactDockedTutorPanelWidth,
      input.guestTutorAssistantLabel,
      input.guidedArrowheadTransition,
      input.guidedAvatarArrowhead,
      input.guidedAvatarArrowheadDisplayAngle,
      input.guidedAvatarArrowheadDisplayAngleLabel,
      input.guidedAvatarLayout,
      input.guidedCalloutDetail,
      input.guidedCalloutHeaderLabel,
      input.guidedCalloutKey,
      input.guidedCalloutLayout,
      input.guidedCalloutStepLabel,
      input.guidedCalloutStyle,
      input.guidedCalloutTestId,
      input.guidedCalloutTitle,
      input.guidedCalloutTransitionDuration,
      input.guidedMode,
      input.guidedSelectionPreview,
      input.guidedTutorTarget,
      input.handleAskAbout,
      input.handleAvatarClick,
      input.handleAvatarMouseDown,
      input.handleCloseChat,
      input.handleCloseGuestIntroCard,
      input.handleCloseGuidedCallout,
      input.handleDisableTutor,
      input.handleFloatingAvatarPointerCancel,
      input.handleFloatingAvatarPointerDown,
      input.handleFloatingAvatarPointerMove,
      input.handleFloatingAvatarPointerUp,
      input.handleGuestIntroAccept,
      input.handleGuestIntroCreateAccount,
      input.handleGuestIntroDismiss,
      input.handleGuestIntroHelpClose,
      input.handleGuestIntroLogin,
      input.handleHomeOnboardingAdvance,
      input.handleHomeOnboardingBack,
      input.handleHomeOnboardingFinishEarly,
      input.handlePanelBackdropClose,
      input.handlePanelHeaderClose,
      input.handleSelectionActionMouseDown,
      input.homeOnboardingStep,
      input.isAnonymousVisitor,
      input.isAskModalMode,
      input.isCompactDockedTutorPanel,
      input.isGuidedTutorMode,
      input.isOpen,
      input.isTutorHidden,
      input.motionProfile,
      input.panelAvatarPlacement,
      input.panelEmptyStateMessage,
      input.panelOpenAnimation,
      input.panelTransition,
      input.pointerMarkerId,
      input.reducedMotionTransitions,
      input.sectionContextSpotlightStyle,
      input.sectionDropHighlightStyle,
      input.sectionGuidanceLabel,
      input.sectionResponsePendingKind,
      input.selectionActionLayout,
      input.selectionActionStyle,
      input.selectionContextSpotlightStyle,
      input.selectionSpotlightStyle,
      input.sessionSurfaceLabel,
      input.shouldRenderGuestIntroUi,
      input.shouldRenderGuidedCallout,
      input.shouldRenderSelectionAction,
      input.showAttachedAvatarShell,
      input.showFloatingAvatar,
      input.showSectionGuidanceCallout,
      input.showSelectionGuidanceCallout,
      input.suppressPanelSurface,
      input.tutorContent,
      input.uiMode,
      input.viewport,
      isGuidedAvatarMode,
      panelBodyContextValue,
      prefersReducedMotionEnabled,
    ]
  );

  return {
    panelBodyContextValue,
    portalContentValue,
  };
}
