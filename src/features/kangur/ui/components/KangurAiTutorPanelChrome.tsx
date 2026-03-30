'use client';

import { AnimatePresence } from 'framer-motion';
import { useRef } from 'react';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { useKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';

import { useKangurAiTutorWidgetStateContext } from './ai-tutor-widget/KangurAiTutorWidget.state';
import { KangurAiTutorRenderedPanel } from './KangurAiTutorPanelChrome.frame';
import { KangurAiTutorPanelSurface } from './KangurAiTutorPanelChrome.surface';
import {
  resolveBubbleMotionTarget,
  resolveDirectionalPanelInitialState,
  resolveHasSnapPreview,
  resolveIsContextualResultChrome,
  resolveIsGenericEmptyStateMessage,
  resolveNarratorControlView,
  resolvePanelAnimateTarget,
  resolvePanelContainerClassName,
  resolvePanelContainerStyle,
  resolvePanelMoodDescription,
  resolvePanelStyleName,
  resolvePanelTransitionValue,
  resolveRenderedPanelAvatarPlacement,
  resolveShouldRenderAttachedAvatar,
  resolveShouldRenderBackdrop,
  resolveShouldRenderPanel,
  resolveShouldRenderPanelMoodDescription,
  resolveShouldRenderPointer,
  resolveShouldTrapFocus,
  resolveSnapPreviewTargetLabel,
  resolveTutorPanelIdentity,
  useKangurAiTutorPanelFocusTrap,
} from './KangurAiTutorPanelChrome.shared';

import type {
  TutorAvatarPointer,
  TutorHorizontalSide,
  TutorPanelChromeVariant,
  TutorMotionProfile,
  TutorPanelSnapState,
  TutorReducedMotionPanelTransitions,
} from './ai-tutor-widget/KangurAiTutorWidget.shared';
import type { KangurAiTutorPanelBodyContextValue } from './KangurAiTutorPanelBody.context';
import type { CSSProperties, JSX, PointerEvent, ReactNode } from 'react';
import type { Transition } from 'framer-motion';

type Props = {
  attachedAvatarStyle: CSSProperties;
  attachedLaunchOffset: {
    x: number;
    y: number;
  };
  avatarAnchorKind: string;
  avatarAttachmentSide: TutorHorizontalSide;
  avatarButtonClassName: string;
  avatarPointer: TutorAvatarPointer | null;
  bubbleEntryDirection: TutorHorizontalSide;
  bubbleMode: 'bubble' | 'sheet';
  bubbleLaunchOrigin: 'dock-bottom-right' | 'sheet';
  bubbleStrategy: string;
  bubbleStyle: Record<string, number | string | undefined>;
  bubbleTailPlacement: 'bottom' | 'dock' | 'top';
  bubbleWidth?: number;
  canDetachPanelFromContext: boolean;
  children: ReactNode;
  canMovePanelToContext: boolean;
  chromeVariant: TutorPanelChromeVariant;
  compactDockedTutorPanelWidth: number;
  canResetPanelPosition: boolean;
  isAskModalMode: boolean;
  isCompactDockedTutorPanel: boolean;
  isFollowingContext: boolean;
  isGuidedTutorMode: boolean;
  isMinimalPanelMode: boolean;
  isOpen: boolean;
  isPanelDraggable: boolean;
  isPanelDragging: boolean;
  isTutorHidden: boolean;
  minimalPanelStyle: CSSProperties;
  panelAvatarPlacement: string;
  panelBodyContextValue: KangurAiTutorPanelBodyContextValue;
  panelEmptyStateMessage: string;
  panelOpenAnimation: 'dock-launch' | 'fade' | 'sheet';
  panelSnapState: TutorPanelSnapState | 'none';
  panelTransition: Transition;
  pointerMarkerId: string;
  prefersReducedMotion: boolean;
  reducedMotionTransitions: TutorReducedMotionPanelTransitions;
  sessionSurfaceLabel: string | null;
  showAttachedAvatarShell: boolean;
  suppressPanelSurface: boolean;
  uiMode: string;
  onAttachedAvatarClick: () => void;
  onAttachedAvatarPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onAttachedAvatarPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onAttachedAvatarPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onAttachedAvatarPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onBackdropClose: () => void;
  onClose: () => void;
  onDetachPanelFromContext: () => void;
  onDisableTutor: () => void;
  onMovePanelToContext: () => void;
  onResetPanelPosition: () => void;
  onHeaderPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  onHeaderPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onHeaderPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onHeaderPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  motionProfile: TutorMotionProfile;
};

export function KangurAiTutorPanelChrome({
  attachedAvatarStyle,
  avatarAnchorKind,
  avatarAttachmentSide,
  avatarButtonClassName,
  avatarPointer,
  bubbleEntryDirection,
  bubbleMode,
  bubbleLaunchOrigin,
  bubbleStrategy,
  bubbleStyle,
  bubbleTailPlacement,
  bubbleWidth,
  canDetachPanelFromContext,
  children,
  canMovePanelToContext,
  chromeVariant,
  compactDockedTutorPanelWidth,
  canResetPanelPosition,
  isAskModalMode,
  isCompactDockedTutorPanel,
  isFollowingContext,
  isGuidedTutorMode,
  isMinimalPanelMode,
  isOpen,
  isPanelDraggable,
  isPanelDragging,
  isTutorHidden,
  minimalPanelStyle,
  motionProfile,
  panelAvatarPlacement,
  panelBodyContextValue,
  panelEmptyStateMessage,
  panelOpenAnimation,
  panelSnapState,
  panelTransition,
  pointerMarkerId,
  prefersReducedMotion,
  reducedMotionTransitions,
  sessionSurfaceLabel,
  showAttachedAvatarShell,
  suppressPanelSurface,
  uiMode,
  onAttachedAvatarClick,
  onAttachedAvatarPointerCancel,
  onAttachedAvatarPointerDown,
  onAttachedAvatarPointerMove,
  onAttachedAvatarPointerUp,
  onBackdropClose,
  onClose,
  onDetachPanelFromContext,
  onDisableTutor,
  onMovePanelToContext,
  onResetPanelPosition,
  onHeaderPointerCancel,
  onHeaderPointerDown,
  onHeaderPointerMove,
  onHeaderPointerUp,
}: Props): JSX.Element {
  const tutorContent = useKangurAiTutorContent();
  const tutor = useKangurAiTutor();
  const { panelMotionState, panelRef, tutorNarrationRootRef } =
    useKangurAiTutorWidgetStateContext();
  const panelSurfaceRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const {
    narratorSettings,
    tutorNarrationScript,
    tutorNarratorContextRegistry,
  } = panelBodyContextValue;

  const shouldUseMinimalPanelShell = isMinimalPanelMode && !isAskModalMode;
  const isContextualResultChrome = resolveIsContextualResultChrome(chromeVariant);
  const shouldRenderPanel = resolveShouldRenderPanel({
    isGuidedTutorMode,
    isMinimalPanelMode,
    isOpen,
    isTutorHidden,
    suppressPanelSurface,
  });
  const {
    dialogLabel,
    tutorBehaviorMoodId,
    tutorBehaviorMoodLabel,
    tutorDisplayName,
    tutorMoodId,
  } = resolveTutorPanelIdentity({
    tutor,
    tutorContent,
  });
  const isGenericEmptyStateMessage = resolveIsGenericEmptyStateMessage({
    panelEmptyStateMessage,
    tutorContent,
  });
  const panelMoodDescription = resolvePanelMoodDescription({
    isGenericEmptyStateMessage,
    panelEmptyStateMessage,
    tutor,
  });
  const snapPreviewTargetLabel = resolveSnapPreviewTargetLabel({
    isPanelDragging,
    panelSnapState,
    tutorContent,
  });
  const hasSnapPreview = resolveHasSnapPreview(snapPreviewTargetLabel);
  const bubbleMotionTarget = resolveBubbleMotionTarget({
    bubbleMode,
    bubbleStyle,
  });
  const panelContainerStyle = resolvePanelContainerStyle({
    bubbleStyle,
    bubbleWidth,
    compactDockedTutorPanelWidth,
    isAskModalMode,
    isCompactDockedTutorPanel,
    minimalPanelStyle,
    shouldUseMinimalPanelShell,
  });
  const directionalPanelInitialState = resolveDirectionalPanelInitialState({
    bubbleEntryDirection,
    bubbleMode,
    bubbleMotionTarget,
    isAskModalMode,
    panelOpenAnimation,
    prefersReducedMotion,
    shouldUseMinimalPanelShell,
  });
  const shouldTrapFocus = resolveShouldTrapFocus({
    bubbleMode,
    isAskModalMode,
    isOpen,
    isTutorHidden,
    shouldUseMinimalPanelShell,
  });
  const narratorControl = resolveNarratorControlView({
    narratorSettings,
    tutorContent,
    tutorNarrationScript,
    tutorNarratorContextRegistry,
  });
  const shouldRenderBackdrop = resolveShouldRenderBackdrop({
    bubbleMode,
    isAskModalMode,
    shouldUseMinimalPanelShell,
  });
  const shouldRenderPointer = resolveShouldRenderPointer({
    avatarPointer,
    isAskModalMode,
    shouldUseMinimalPanelShell,
  });
  const shouldRenderAttachedAvatar = resolveShouldRenderAttachedAvatar({
    isAskModalMode,
    shouldUseMinimalPanelShell,
    showAttachedAvatarShell,
  });
  const panelContainerClassName = resolvePanelContainerClassName({
    isAskModalMode,
    shouldUseMinimalPanelShell,
  });
  const panelAnimateTarget = resolvePanelAnimateTarget({
    bubbleMotionTarget,
    isAskModalMode,
    shouldUseMinimalPanelShell,
  });
  const panelTransitionValue = resolvePanelTransitionValue({
    isAskModalMode,
    motionProfile,
    panelTransition,
    shouldUseMinimalPanelShell,
  });
  const panelStyleName = resolvePanelStyleName(shouldUseMinimalPanelShell);
  const resolvedPanelAvatarPlacement = resolveRenderedPanelAvatarPlacement({
    panelAvatarPlacement,
    shouldUseMinimalPanelShell,
  });
  const shouldRenderPanelMoodDescription = resolveShouldRenderPanelMoodDescription({
    isCompactDockedTutorPanel,
    panelEmptyStateMessage,
    panelMoodDescription,
    shouldUseMinimalPanelShell,
  });

  useKangurAiTutorPanelFocusTrap({
    panelSurfaceRef,
    previousFocusRef,
    shouldTrapFocus,
  });

  const panelSurface = (
    <KangurAiTutorPanelSurface
      avatarAttachmentSide={avatarAttachmentSide}
      avatarPointer={avatarPointer}
      bubbleMode={bubbleMode}
      bubbleTailPlacement={bubbleTailPlacement}
      canDetachPanelFromContext={canDetachPanelFromContext}
      canMovePanelToContext={canMovePanelToContext}
      canResetPanelPosition={canResetPanelPosition}
      chromeVariant={chromeVariant}
      handleClosePanel={onClose}
      handleDetachPanelFromContext={onDetachPanelFromContext}
      handleDisableTutor={onDisableTutor}
      handleMovePanelToContext={onMovePanelToContext}
      handleResetPanelPosition={onResetPanelPosition}
      hasSnapPreview={hasSnapPreview}
      isAskModalMode={isAskModalMode}
      isCompactDockedTutorPanel={isCompactDockedTutorPanel}
      isContextualResultChrome={isContextualResultChrome}
      isFollowingContext={isFollowingContext}
      isPanelDragging={isPanelDragging}
      isPanelDraggable={isPanelDraggable}
      narratorControl={narratorControl}
      onHeaderPointerCancel={onHeaderPointerCancel}
      onHeaderPointerDown={onHeaderPointerDown}
      onHeaderPointerMove={onHeaderPointerMove}
      onHeaderPointerUp={onHeaderPointerUp}
      panelMoodDescription={panelMoodDescription}
      panelSnapState={panelSnapState}
      panelSurfaceRef={panelSurfaceRef}
      sessionSurfaceLabel={sessionSurfaceLabel}
      shouldRenderPanelMoodDescription={shouldRenderPanelMoodDescription}
      shouldTrapFocus={shouldTrapFocus}
      shouldUseMinimalPanelShell={shouldUseMinimalPanelShell}
      showAttachedAvatarShell={showAttachedAvatarShell}
      snapPreviewTargetLabel={snapPreviewTargetLabel}
      tutorBehaviorMoodId={tutorBehaviorMoodId}
      tutorBehaviorMoodLabel={tutorBehaviorMoodLabel}
      tutorContent={tutorContent}
      tutorDisplayName={tutorDisplayName}
      tutorNarrationRootRef={tutorNarrationRootRef}
      uiMode={uiMode}
    >
      {children}
    </KangurAiTutorPanelSurface>
  );

  return (
    <AnimatePresence>
      {shouldRenderPanel ? (
        <KangurAiTutorRenderedPanel
          attachedAvatarStyle={attachedAvatarStyle}
          avatarAnchorKind={avatarAnchorKind}
          avatarAttachmentSide={avatarAttachmentSide}
          avatarButtonClassName={avatarButtonClassName}
          avatarPointer={avatarPointer}
          bubbleEntryDirection={bubbleEntryDirection}
          bubbleLaunchOrigin={bubbleLaunchOrigin}
          bubbleMode={bubbleMode}
          bubbleStrategy={bubbleStrategy}
          hasSnapPreview={hasSnapPreview}
          dialogLabel={dialogLabel}
          directionalPanelInitialState={directionalPanelInitialState}
          isBusy={panelBodyContextValue.isLoading}
          isAskModalMode={isAskModalMode}
          isPanelDraggable={isPanelDraggable}
          isPanelDragging={isPanelDragging}
          motionProfile={motionProfile}
          onAttachedAvatarClick={onAttachedAvatarClick}
          onAttachedAvatarPointerCancel={onAttachedAvatarPointerCancel}
          onAttachedAvatarPointerDown={onAttachedAvatarPointerDown}
          onAttachedAvatarPointerMove={onAttachedAvatarPointerMove}
          onAttachedAvatarPointerUp={onAttachedAvatarPointerUp}
          onBackdropClose={onBackdropClose}
          panelAnimateTarget={panelAnimateTarget}
          panelContainerClassName={panelContainerClassName}
          panelContainerStyle={panelContainerStyle}
          panelMotionState={panelMotionState}
          panelOpenAnimation={panelOpenAnimation}
          panelRef={panelRef}
          panelSurface={panelSurface}
          panelStyleName={panelStyleName}
          panelTransitionValue={panelTransitionValue}
          panelSnapState={panelSnapState}
          prefersReducedMotion={prefersReducedMotion}
          pointerMarkerId={pointerMarkerId}
          reducedMotionTransitions={reducedMotionTransitions}
          resolvedPanelAvatarPlacement={resolvedPanelAvatarPlacement}
          shouldRenderAttachedAvatar={shouldRenderAttachedAvatar}
          shouldRenderBackdrop={shouldRenderBackdrop}
          shouldRenderPointer={shouldRenderPointer}
          tutor={tutor}
          tutorContent={tutorContent}
          tutorDisplayName={tutorDisplayName}
          tutorMoodId={tutorMoodId}
          uiMode={uiMode}
        />
      ) : null}
    </AnimatePresence>
  );
}
