'use client';

import { useMemo } from 'react';

import type { KangurAiTutorContent } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';

import { getEstimatedBubbleHeight } from './KangurAiTutorGuidedLayout';
import { getTutorBubblePlacement } from './KangurAiTutorWidget.focus-layout';
import { getGuestIntroPanelStyle } from './KangurAiTutorWidget.storage';
import type { KangurAiTutorPanelBodyContextValue } from './KangurAiTutorPanelBody.context';
import type { KangurAiTutorPortalContextValue } from './KangurAiTutorPortal.context';
import {
  EDGE_GAP,
  type TutorEdgePlacement,
  type TutorMotionProfile,
  type TutorPanelChromeVariant,
  type TutorQuickAction,
} from './KangurAiTutorWidget.shared';
import type {
  GuidedTutorTarget,
  TutorPanelShellMode,
  TutorHomeOnboardingStep,
} from './KangurAiTutorWidget.types';

type GuidedMode = KangurAiTutorPortalContextValue['guidedCallout']['mode'];
type ReducedMotionTransitions = KangurAiTutorPortalContextValue['avatar']['reducedMotionTransitions'];
type TutorSurfaceMode =
  | 'idle_avatar'
  | 'onboarding'
  | 'auth_guided'
  | 'selection_guided'
  | 'section_guided'
  | 'chat';

const isGuidedCalloutAvatarPlacement = (
  value: string | null | undefined
): value is TutorEdgePlacement =>
  value === 'top' || value === 'bottom' || value === 'left' || value === 'right';

const DRAWING_PANEL_WIDTH = 360;
const DRAWING_PANEL_HEIGHT = 360;

const createRect = (left: number, top: number, width: number, height: number): DOMRect => {
  if (typeof DOMRect === 'function') {
    return new DOMRect(left, top, width, height);
  }

  return {
    x: left,
    y: top,
    width,
    height,
    top,
    right: left + width,
    bottom: top + height,
    left,
    toJSON: () => ({
      x: left,
      y: top,
      width,
      height,
      top,
      right: left + width,
      bottom: top + height,
      left,
    }),
  } as DOMRect;
};

type UseKangurAiTutorPortalViewModelInput = {
  activeFocus: KangurAiTutorPanelBodyContextValue['activeFocus'];
  activeSectionRect: KangurAiTutorPanelBodyContextValue['activeSectionRect'];
  activeSelectedText: KangurAiTutorPanelBodyContextValue['activeSelectedText'];
  activeSelectionPageRect: KangurAiTutorPanelBodyContextValue['activeSelectionPageRect'];
  activeSelectionProtectedRect: DOMRect | null;
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
    entryDirection: KangurAiTutorPortalContextValue['panel']['bubbleEntryDirection'];
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
  canonicalTutorModalVisible: boolean;
  compactDockedTutorPanelWidth: KangurAiTutorPortalContextValue['panel']['compactDockedTutorPanelWidth'];
  contextualTutorMode: 'selection_explain' | 'section_explain' | null;
  drawingImageData: KangurAiTutorPanelBodyContextValue['drawingImageData'];
  drawingMode: KangurAiTutorPanelBodyContextValue['drawingMode'];
  drawingPanelOpen: boolean;
  emptyStateMessage: KangurAiTutorPanelBodyContextValue['emptyStateMessage'];
  floatingAvatarPlacement: KangurAiTutorPortalContextValue['avatar']['floatingAvatarPlacement'];
  focusChipLabel: KangurAiTutorPanelBodyContextValue['focusChipLabel'];
  guestAuthFormVisible: boolean;
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
    entryDirection: KangurAiTutorPortalContextValue['guidedCallout']['entryDirection'];
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
  handleAvatarMouseUp: KangurAiTutorPortalContextValue['avatar']['onMouseUp'];
  handleClearDrawing: KangurAiTutorPanelBodyContextValue['handleClearDrawing'];
  handleCloseChat: (reason: 'toggle' | 'header' | 'outside') => void;
  handleGuestIntroClose: KangurAiTutorPortalContextValue['guestIntro']['onClose'];
  handleGuestIntroDismiss: KangurAiTutorPortalContextValue['guestIntro']['onDismiss'];
  handleCloseGuidedCallout: KangurAiTutorPortalContextValue['guidedCallout']['onClose'];
  handleDrawingComplete: KangurAiTutorPanelBodyContextValue['handleDrawingComplete'];
  handleOpenDrawingPanel: () => void;
  handleCloseDrawingPanel: () => void;
  handleDetachHighlightedSection: KangurAiTutorPanelBodyContextValue['handleDetachHighlightedSection'];
  handleDetachPanelFromContext: KangurAiTutorPortalContextValue['panel']['onDetachPanelFromContext'];
  handleDetachSelectedFragment: KangurAiTutorPanelBodyContextValue['handleDetachSelectedFragment'];
  handleDisableTutor: KangurAiTutorPortalContextValue['panel']['onDisableTutor'];
  handleFloatingAvatarPointerCancel: KangurAiTutorPortalContextValue['avatar']['onPointerCancel'];
  handleFloatingAvatarPointerDown: KangurAiTutorPortalContextValue['avatar']['onPointerDown'];
  handleFloatingAvatarPointerMove: KangurAiTutorPortalContextValue['avatar']['onPointerMove'];
  handleFloatingAvatarPointerUp: KangurAiTutorPortalContextValue['avatar']['onPointerUp'];
  handleAttachedAvatarPointerCancel: KangurAiTutorPortalContextValue['panel']['onAttachedAvatarPointerCancel'];
  handleAttachedAvatarPointerDown: KangurAiTutorPortalContextValue['panel']['onAttachedAvatarPointerDown'];
  handleAttachedAvatarPointerMove: KangurAiTutorPortalContextValue['panel']['onAttachedAvatarPointerMove'];
  handleAttachedAvatarPointerUp: KangurAiTutorPortalContextValue['panel']['onAttachedAvatarPointerUp'];
  handleFocusHighlightedSection: KangurAiTutorPanelBodyContextValue['handleFocusHighlightedSection'];
  handleFocusSelectedFragment: KangurAiTutorPanelBodyContextValue['handleFocusSelectedFragment'];
  handleFollowUpClick: KangurAiTutorPanelBodyContextValue['handleFollowUpClick'];
  handleWebsiteHelpTargetClick: KangurAiTutorPanelBodyContextValue['handleWebsiteHelpTargetClick'];
  handleGuestIntroAcceptSilent: () => void;
  handleGuestIntroStartChat: KangurAiTutorPortalContextValue['guestIntro']['onStartChat'];
  handleHomeOnboardingAdvance: KangurAiTutorPortalContextValue['guidedCallout']['onAdvanceHomeOnboarding'];
  handleHomeOnboardingBack: KangurAiTutorPortalContextValue['guidedCallout']['onBackHomeOnboarding'];
  handleHomeOnboardingFinishEarly: KangurAiTutorPortalContextValue['guidedCallout']['onFinishHomeOnboarding'];
  handleKeyDown: KangurAiTutorPanelBodyContextValue['handleKeyDown'];
  handleMessageFeedback: KangurAiTutorPanelBodyContextValue['handleMessageFeedback'];
  handleMovePanelToContext: KangurAiTutorPortalContextValue['panel']['onMovePanelToContext'];
  handlePanelBackdropClose: KangurAiTutorPortalContextValue['panel']['onBackdropClose'];
  handlePanelHeaderClose: KangurAiTutorPortalContextValue['panel']['onClose'];
  handleResetPanelPosition: KangurAiTutorPortalContextValue['panel']['onResetPanelPosition'];
  handlePanelHeaderPointerCancel: KangurAiTutorPortalContextValue['panel']['onHeaderPointerCancel'];
  handlePanelHeaderPointerDown: KangurAiTutorPortalContextValue['panel']['onHeaderPointerDown'];
  handlePanelHeaderPointerMove: KangurAiTutorPortalContextValue['panel']['onHeaderPointerMove'];
  handlePanelHeaderPointerUp: KangurAiTutorPortalContextValue['panel']['onHeaderPointerUp'];
  handleQuickAction: KangurAiTutorPanelBodyContextValue['handleQuickAction'];
  handleSelectionActionMouseDown: KangurAiTutorPortalContextValue['selectionAction']['onSelectionActionMouseDown'];
  handleSend: KangurAiTutorPanelBodyContextValue['handleSend'];
  handleStartHomeOnboarding: KangurAiTutorPanelBodyContextValue['handleStartHomeOnboarding'];
  handleToggleDrawing: KangurAiTutorPanelBodyContextValue['handleToggleDrawing'];
  homeOnboardingReplayLabel: KangurAiTutorPanelBodyContextValue['homeOnboardingReplayLabel'];
  homeOnboardingStep: TutorHomeOnboardingStep | null;
  inputPlaceholder: KangurAiTutorPanelBodyContextValue['inputPlaceholder'];
  isAnonymousVisitor: KangurAiTutorPortalContextValue['guestIntro']['isAnonymousVisitor'];
  isAskModalMode: KangurAiTutorPanelBodyContextValue['isAskModalMode'];
  isCompactDockedTutorPanel: KangurAiTutorPortalContextValue['panel']['isCompactDockedTutorPanel'];
  isGuidedTutorMode: KangurAiTutorPortalContextValue['avatar']['isGuidedTutorMode'];
  isLoading: KangurAiTutorPanelBodyContextValue['isLoading'];
  isOpen: KangurAiTutorPortalContextValue['avatar']['isOpen'];
  isPanelFollowingContext: boolean;
  isPanelContextMoveAvailable: boolean;
  isPanelPositionCustomized: boolean;
  isPanelDraggable: KangurAiTutorPortalContextValue['panel']['isPanelDraggable'];
  isPanelDragging: KangurAiTutorPortalContextValue['panel']['isPanelDragging'];
  isSectionExplainPendingMode: KangurAiTutorPanelBodyContextValue['isSectionExplainPendingMode'];
  isSelectionExplainPendingMode: KangurAiTutorPanelBodyContextValue['isSelectionExplainPendingMode'];
  isTutorHidden: KangurAiTutorPortalContextValue['panel']['isTutorHidden'];
  isUsageLoading: KangurAiTutorPanelBodyContextValue['isUsageLoading'];
  lastInteractionIntent: KangurAiTutorPanelBodyContextValue['lastInteractionIntent'];
  lastPromptMode: KangurAiTutorPanelBodyContextValue['lastPromptMode'];
  messages: KangurAiTutorPanelBodyContextValue['messages'];
  motionProfile: TutorMotionProfile;
  narratorSettings: KangurAiTutorPanelBodyContextValue['narratorSettings'];
  panelAvatarPlacement: KangurAiTutorPortalContextValue['panel']['panelAvatarPlacement'];
  panelEmptyStateMessage: KangurAiTutorPanelBodyContextValue['panelEmptyStateMessage'];
  panelMeasuredHeight: number | null;
  panelOpenAnimation: KangurAiTutorPortalContextValue['panel']['panelOpenAnimation'];
  panelSnapState: KangurAiTutorPortalContextValue['panel']['panelSnapState'];
  panelShellMode: TutorPanelShellMode;
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
  selectionGlowStyles: KangurAiTutorPortalContextValue['spotlights']['selectionGlowStyles'];
  selectionContextSpotlightStyle: KangurAiTutorPortalContextValue['spotlights']['selectionContextSpotlightStyle'];
  selectionSpotlightStyle: KangurAiTutorPortalContextValue['spotlights']['selectionSpotlightStyle'];
  sessionSurface: KangurAiTutorPanelBodyContextValue['sessionSurface'];
  sessionSurfaceLabel: KangurAiTutorPortalContextValue['panel']['sessionSurfaceLabel'];
  shouldRenderAuxiliaryPanelControls: KangurAiTutorPanelBodyContextValue['shouldRenderAuxiliaryPanelControls'];
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
  tutorSurfaceMode: TutorSurfaceMode;
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
  const hasContextualTutorLock =
    input.tutorSurfaceMode === 'selection_guided' ||
    input.tutorSurfaceMode === 'section_guided';
  const hasGuidedContextualTransition =
    input.contextualTutorMode !== null ||
    input.guidedMode === 'selection' ||
    input.guidedMode === 'section' ||
    input.isSelectionExplainPendingMode ||
    input.isSectionExplainPendingMode ||
    input.showSelectionGuidanceCallout ||
    input.showSectionGuidanceCallout;
  const guestIntroHeadline = input.tutorContent.guestIntro.initial.headline;
  const guestIntroDescription = input.tutorContent.guestIntro.initial.description;
  const handleCanonicalOnboardingAccept = input.handleGuestIntroStartChat;
  const handleCanonicalOnboardingClose = input.handleGuestIntroClose;
  const handleCanonicalOnboardingDismiss = input.handleGuestIntroDismiss;
  const shouldRenderGuestIntro =
    input.tutorSurfaceMode === 'onboarding' &&
    !hasContextualTutorLock &&
    !hasGuidedContextualTransition &&
    (input.canonicalTutorModalVisible || (!input.isAskModalMode && !isGuidedAvatarMode));
  const isMinimalPanelMode =
    !input.isAskModalMode &&
    input.panelShellMode === 'minimal';
  const panelChromeVariant: TutorPanelChromeVariant =
    input.showSelectionExplainCompleteState || input.showSectionExplainCompleteState
      ? 'contextual_result'
      : 'default';
  const minimalPanelStyle = getGuestIntroPanelStyle(input.viewport);
  const showToolboxLayout =
    input.uiMode === 'freeform' &&
    !input.isAskModalMode &&
    input.panelShellMode === 'default' &&
    !input.isCompactDockedTutorPanel;
  const guidedCalloutAvatarPlacement = isGuidedCalloutAvatarPlacement(
    input.guidedAvatarLayout?.placement
  )
    ? input.guidedAvatarLayout.placement
    : null;
  const canShowDrawingSidePanel =
    input.bubblePlacement.mode === 'bubble' &&
    !input.isAskModalMode &&
    input.viewport.width >= input.motionProfile.sheetBreakpoint &&
    input.isOpen &&
    !input.suppressPanelSurface;
  const panelWidth = input.isCompactDockedTutorPanel
    ? input.compactDockedTutorPanelWidth
    : input.bubblePlacement.width ?? input.motionProfile.desktopBubbleWidth;
  const panelLeft =
    typeof input.bubblePlacement.style?.['left'] === 'number'
      ? input.bubblePlacement.style['left']
      : null;
  const panelTop =
    typeof input.bubblePlacement.style?.['top'] === 'number'
      ? input.bubblePlacement.style['top']
      : null;
  const panelHeight = input.panelMeasuredHeight ?? getEstimatedBubbleHeight(input.viewport);
  const panelRect = useMemo(
    () =>
      panelLeft !== null && panelTop !== null
        ? createRect(panelLeft, panelTop, panelWidth, panelHeight)
        : null,
    [panelHeight, panelLeft, panelTop, panelWidth]
  );
  const drawingPanelAvailable = canShowDrawingSidePanel && Boolean(panelRect);
  const drawingPanelLayout = useMemo(() => {
    if (!input.drawingPanelOpen || !drawingPanelAvailable || !panelRect) {
      return null;
    }

    const drawingWidth = Math.min(
      DRAWING_PANEL_WIDTH,
      Math.max(240, input.viewport.width - EDGE_GAP * 2)
    );
    const drawingHeight = Math.min(
      DRAWING_PANEL_HEIGHT,
      Math.max(220, input.viewport.height - EDGE_GAP * 2)
    );
    const placement = getTutorBubblePlacement(
      panelRect,
      input.viewport,
      'bubble',
      {
        desktop: drawingWidth,
        mobile: drawingWidth,
      },
      {
        estimatedHeight: drawingHeight,
        protectedRects: input.activeSelectionProtectedRect
          ? [input.activeSelectionProtectedRect]
          : [],
      }
    );

    if (
      typeof placement.style.left !== 'number' ||
      typeof placement.style.top !== 'number'
    ) {
      return null;
    }

    return {
      style: {
        position: 'fixed' as const,
        left: placement.style.left,
        top: placement.style.top,
        width: placement.width ?? drawingWidth,
        zIndex: 66,
      },
    };
  }, [
    drawingPanelAvailable,
    input.activeSelectionProtectedRect,
    input.drawingPanelOpen,
    input.viewport,
    panelRect,
  ]);

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
      drawingImageData: input.drawingImageData,
      drawingMode: input.drawingMode,
      drawingPanelOpen: input.drawingPanelOpen,
      drawingPanelAvailable,
      guestAuthFormVisible: input.guestAuthFormVisible,
      emptyStateMessage: input.emptyStateMessage,
      focusChipLabel: input.focusChipLabel,
      handleClearDrawing: input.handleClearDrawing,
      handleCloseDrawingPanel: input.handleCloseDrawingPanel,
      handleDetachHighlightedSection: input.handleDetachHighlightedSection,
      handleDetachSelectedFragment: input.handleDetachSelectedFragment,
      handleFocusHighlightedSection: input.handleFocusHighlightedSection,
      handleFocusSelectedFragment: input.handleFocusSelectedFragment,
      handleDrawingComplete: input.handleDrawingComplete,
      handleOpenDrawingPanel: input.handleOpenDrawingPanel,
      handleFollowUpClick: input.handleFollowUpClick,
      handleKeyDown: input.handleKeyDown,
      handleMessageFeedback: input.handleMessageFeedback,
      handleWebsiteHelpTargetClick: input.handleWebsiteHelpTargetClick,
      handleQuickAction: input.handleQuickAction,
      handleSend: input.handleSend,
      handleStartHomeOnboarding: input.handleStartHomeOnboarding,
      handleToggleDrawing: input.handleToggleDrawing,
      homeOnboardingReplayLabel: input.homeOnboardingReplayLabel,
      inputPlaceholder: input.inputPlaceholder,
      isAskModalMode: input.isAskModalMode,
      isLoading: input.isLoading,
      isMinimalPanelMode,
      lastInteractionIntent: input.lastInteractionIntent,
      lastPromptMode: input.lastPromptMode,
      isSectionExplainPendingMode: input.isSectionExplainPendingMode,
      isSelectionExplainPendingMode: input.isSelectionExplainPendingMode,
      isUsageLoading: input.isUsageLoading,
      messages: input.messages,
      narratorSettings: input.narratorSettings,
      panelEmptyStateMessage: input.panelEmptyStateMessage,
      remainingMessages: input.remainingMessages,
      selectedTextPreview: input.selectedTextPreview,
      sessionSurface: input.sessionSurface,
      showToolboxLayout,
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
      input.drawingImageData,
      input.drawingMode,
      input.drawingPanelOpen,
      drawingPanelAvailable,
      input.guestAuthFormVisible,
      input.emptyStateMessage,
      input.focusChipLabel,
      input.handleClearDrawing,
      input.handleCloseDrawingPanel,
      input.handleDetachHighlightedSection,
      input.handleDetachSelectedFragment,
      input.handleDrawingComplete,
      input.handleOpenDrawingPanel,
      input.handleFocusHighlightedSection,
      input.handleFocusSelectedFragment,
      input.handleFollowUpClick,
      input.handleKeyDown,
      input.handleMessageFeedback,
      input.handleWebsiteHelpTargetClick,
      input.handleQuickAction,
      input.handleSend,
      input.handleStartHomeOnboarding,
      input.handleToggleDrawing,
      input.homeOnboardingReplayLabel,
      input.inputPlaceholder,
      input.isAskModalMode,
      input.isLoading,
      isMinimalPanelMode,
      input.lastInteractionIntent,
      input.lastPromptMode,
      input.isSectionExplainPendingMode,
      input.isSelectionExplainPendingMode,
      input.isUsageLoading,
      input.messages,
      input.narratorSettings,
      input.panelEmptyStateMessage,
      input.remainingMessages,
      input.selectedTextPreview,
      input.sessionSurface,
      showToolboxLayout,
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
        onMouseUp: input.handleAvatarMouseUp,
        onPointerCancel: input.handleFloatingAvatarPointerCancel,
        onPointerDown: input.handleFloatingAvatarPointerDown,
        onPointerMove: input.handleFloatingAvatarPointerMove,
        onPointerUp: input.handleFloatingAvatarPointerUp,
        prefersReducedMotion: prefersReducedMotionEnabled,
        reducedMotionTransitions: input.reducedMotionTransitions,
        rimColor: 'var(--kangur-chat-floating-avatar-rim, #78350f)',
        showFloatingAvatar: input.showFloatingAvatar,
        uiMode: input.uiMode,
      },
      diagnostics: {
        canonicalTutorModalVisible: input.canonicalTutorModalVisible,
        contextualTutorMode: input.contextualTutorMode,
        guidedMode: input.guidedMode,
        guestIntroShouldRender: shouldRenderGuestIntro,
        isMinimalPanelMode,
        isOpen: input.isOpen,
        panelShellMode: input.panelShellMode,
        suppressPanelSurface: input.suppressPanelSurface,
        tutorSurfaceMode: input.tutorSurfaceMode,
      },
      drawingPanel: {
        shouldRender: Boolean(drawingPanelLayout?.style),
        style: drawingPanelLayout?.style ?? null,
        prefersReducedMotion: prefersReducedMotionEnabled,
        hint: input.tutorContent.guidedCallout.selectionSketchHint,
        onClose: input.handleCloseDrawingPanel,
        onComplete: input.handleDrawingComplete,
      },
      guestIntro: {
        guestIntroDescription,
        guestIntroHeadline,
        guestTutorLabel: input.guestTutorAssistantLabel,
        isAnonymousVisitor: input.isAnonymousVisitor,
        panelStyle: getGuestIntroPanelStyle(input.viewport),
        prefersReducedMotion: prefersReducedMotionEnabled,
        shouldRender: shouldRenderGuestIntro,
        onAccept: handleCanonicalOnboardingAccept,
        onClose: handleCanonicalOnboardingClose,
        onDismiss: handleCanonicalOnboardingDismiss,
        onStartChat: input.handleGuestIntroStartChat,
      },
      guidedCallout: {
        avatarPlacement: guidedCalloutAvatarPlacement,
        calloutKey: input.guidedCalloutKey,
        calloutTestId: input.guidedCalloutTestId,
        detail: input.guidedCalloutDetail ?? '',
        entryDirection: input.guidedCalloutLayout?.entryDirection ?? 'right',
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
        bubbleEntryDirection: input.bubblePlacement.entryDirection,
        bubbleLaunchOrigin: input.bubblePlacement.launchOrigin,
        bubbleMode: input.bubblePlacement.mode,
        bubbleStrategy: input.bubblePlacement.strategy,
        bubbleStyle: input.bubblePlacement.style,
        bubbleTailPlacement: input.bubblePlacement.tailPlacement,
        bubbleWidth: input.bubblePlacement.width,
        canDetachPanelFromContext: input.isPanelFollowingContext,
        canMovePanelToContext:
          input.isPanelContextMoveAvailable && !input.isPanelFollowingContext,
        chromeVariant: panelChromeVariant,
        canResetPanelPosition: input.isPanelPositionCustomized,
        compactDockedTutorPanelWidth: input.compactDockedTutorPanelWidth,
        isAskModalMode: input.isAskModalMode,
        isCompactDockedTutorPanel: input.isCompactDockedTutorPanel,
        isFollowingContext: input.isPanelFollowingContext,
        isGuidedTutorMode: input.isGuidedTutorMode,
        isMinimalPanelMode,
        isOpen: input.isOpen,
        isPanelDraggable: input.isPanelDraggable,
        isPanelDragging: input.isPanelDragging,
        isTutorHidden: input.isTutorHidden,
        minimalPanelStyle,
        motionProfile: input.motionProfile,
        onAttachedAvatarClick: input.handleAvatarClick,
        onAttachedAvatarPointerCancel: input.handleAttachedAvatarPointerCancel,
        onAttachedAvatarPointerDown: input.handleAttachedAvatarPointerDown,
        onAttachedAvatarPointerMove: input.handleAttachedAvatarPointerMove,
        onAttachedAvatarPointerUp: input.handleAttachedAvatarPointerUp,
        onBackdropClose: input.handlePanelBackdropClose,
        onClose: input.handlePanelHeaderClose,
        onDetachPanelFromContext: input.handleDetachPanelFromContext,
        onDisableTutor: input.handleDisableTutor,
        onMovePanelToContext: input.handleMovePanelToContext,
        onResetPanelPosition: input.handleResetPanelPosition,
        onHeaderPointerCancel: input.handlePanelHeaderPointerCancel,
        onHeaderPointerDown: input.handlePanelHeaderPointerDown,
        onHeaderPointerMove: input.handlePanelHeaderPointerMove,
        onHeaderPointerUp: input.handlePanelHeaderPointerUp,
        panelAvatarPlacement: input.panelAvatarPlacement,
        panelBodyContextValue,
        panelEmptyStateMessage: input.panelEmptyStateMessage,
        panelOpenAnimation: input.panelOpenAnimation,
        panelSnapState: input.panelSnapState,
        panelTransition: input.panelTransition,
        pointerMarkerId: input.pointerMarkerId,
        prefersReducedMotion: prefersReducedMotionEnabled,
        reducedMotionTransitions: input.reducedMotionTransitions,
        sessionSurfaceLabel: input.sessionSurfaceLabel,
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
        selectionGlowStyles: input.selectionGlowStyles,
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
      input.canonicalTutorModalVisible,
      input.bubblePlacement,
      drawingPanelLayout,
      input.handleDetachPanelFromContext,
      input.compactDockedTutorPanelWidth,
      input.contextualTutorMode,
      panelChromeVariant,
      input.guestTutorAssistantLabel,
      input.guidedArrowheadTransition,
      input.guidedAvatarArrowhead,
      input.guidedAvatarArrowheadDisplayAngle,
      input.guidedAvatarArrowheadDisplayAngleLabel,
      input.guidedAvatarLayout,
      guidedCalloutAvatarPlacement,
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
      input.handleAttachedAvatarPointerCancel,
      input.handleAttachedAvatarPointerDown,
      input.handleAttachedAvatarPointerMove,
      input.handleAttachedAvatarPointerUp,
      input.handleAvatarClick,
      input.handleAvatarMouseDown,
      input.handleAvatarMouseUp,
      input.handleCloseChat,
      input.handleCloseDrawingPanel,
      input.handleGuestIntroClose,
      input.handleGuestIntroDismiss,
      input.handleCloseGuidedCallout,
      input.handleDisableTutor,
      input.handleDrawingComplete,
      input.handlePanelHeaderPointerCancel,
      input.handlePanelHeaderPointerDown,
      input.handlePanelHeaderPointerMove,
      input.handlePanelHeaderPointerUp,
      input.handleFloatingAvatarPointerCancel,
      input.handleFloatingAvatarPointerDown,
      input.handleFloatingAvatarPointerMove,
      input.handleFloatingAvatarPointerUp,
      input.handleGuestIntroAcceptSilent,
      input.handleGuestIntroStartChat,
      input.handleHomeOnboardingAdvance,
      input.handleHomeOnboardingBack,
      input.handleHomeOnboardingFinishEarly,
      input.handleMovePanelToContext,
      input.handlePanelBackdropClose,
      input.handlePanelHeaderClose,
      input.handleResetPanelPosition,
      input.handleSelectionActionMouseDown,
      input.canStartHomeOnboardingManually,
      input.homeOnboardingStep,
      input.isAnonymousVisitor,
      input.isAskModalMode,
      input.isCompactDockedTutorPanel,
      input.isGuidedTutorMode,
      input.isPanelFollowingContext,
      input.isPanelContextMoveAvailable,
      input.isPanelPositionCustomized,
      input.isPanelDraggable,
      input.isPanelDragging,
      isMinimalPanelMode,
      input.isOpen,
      input.isTutorHidden,
      minimalPanelStyle,
      input.motionProfile,
      input.panelAvatarPlacement,
      input.panelEmptyStateMessage,
      input.panelOpenAnimation,
      input.panelSnapState,
      input.panelShellMode,
      input.panelTransition,
      input.pointerMarkerId,
      input.reducedMotionTransitions,
      input.sectionContextSpotlightStyle,
      input.sectionDropHighlightStyle,
      input.selectionGlowStyles,
      input.sectionGuidanceLabel,
      input.sectionResponsePendingKind,
      input.selectionActionLayout,
      input.selectionActionStyle,
      input.selectionContextSpotlightStyle,
      input.selectionSpotlightStyle,
      input.sessionSurfaceLabel,
      shouldRenderGuestIntro,
      input.shouldRenderGuidedCallout,
      input.shouldRenderSelectionAction,
      input.showAttachedAvatarShell,
      input.showFloatingAvatar,
      input.showSectionGuidanceCallout,
      input.showSelectionGuidanceCallout,
      input.suppressPanelSurface,
      input.tutorContent,
      input.tutorSurfaceMode,
      input.uiMode,
      input.viewport,
      hasContextualTutorLock,
      hasGuidedContextualTransition,
      handleCanonicalOnboardingAccept,
      handleCanonicalOnboardingDismiss,
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
