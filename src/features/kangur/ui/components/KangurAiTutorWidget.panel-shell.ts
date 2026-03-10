'use client';

import { useId, type CSSProperties } from 'react';

import {
  ATTACHED_AVATAR_EDGE_INSET,
  ATTACHED_AVATAR_OVERLAP,
  ATTACHED_AVATAR_POINTER_EDGE_INSET,
  ATTACHED_AVATAR_POINTER_PADDING,
  AVATAR_SIZE,
  EDGE_GAP,
  type TutorAvatarAttachmentSide,
  type TutorBubblePlacementStrategy,
  type TutorMotionPosition,
  type TutorMotionProfile,
  type TutorPointerSide,
} from './KangurAiTutorWidget.shared';

import type { Transition } from 'framer-motion';


type BubblePlacement = {
  launchOrigin: 'dock-bottom-right' | 'sheet';
  mode: 'bubble' | 'sheet';
  strategy: TutorBubblePlacementStrategy;
  style: Record<string, number | string | undefined>;
  width?: number;
};

type ReducedMotionTransitions = {
  instant: {
    duration: number;
  };
};

type GuidedTutorTargetLike = {
  kind: string;
} | null;

type PanelShellPoint = {
  x: number;
  y: number;
};

type RectLike = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

type AvatarPointer = {
  end: {
    x: number;
    y: number;
  };
  height: number;
  left: number;
  side: 'left' | 'right';
  start: {
    x: number;
    y: number;
  };
  top: number;
  width: number;
};

type PanelShellState = {
  attachedAvatarStyle: CSSProperties;
  attachedLaunchOffset: {
    x: number;
    y: number;
  };
  avatarAnchorKind: string;
  avatarAttachmentSide: TutorAvatarAttachmentSide;
  avatarPointer: AvatarPointer | null;
  avatarStyle: TutorMotionPosition;
  floatingAvatarPlacement: 'ask-modal' | 'guided' | 'floating';
  panelAvatarPlacement: 'attached' | 'hidden' | 'independent';
  panelOpenAnimation: 'dock-launch' | 'fade' | 'sheet';
  panelTransition: Transition;
  pointerMarkerId: string;
  showAttachedAvatarShell: boolean;
  showFloatingAvatar: boolean;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const getDockAvatarPoint = (viewport: { width: number; height: number }): PanelShellPoint => ({
  x: viewport.width - EDGE_GAP - AVATAR_SIZE,
  y: viewport.height - EDGE_GAP - AVATAR_SIZE,
});

const getDockAvatarStyle = (viewport: { width: number; height: number }): TutorMotionPosition => {
  const point = getDockAvatarPoint(viewport);
  return {
    left: point.x,
    top: point.y,
  };
};

const getDockAvatarRect = (viewport: { width: number; height: number }): RectLike => {
  const point = getDockAvatarPoint(viewport);
  return {
    left: point.x,
    top: point.y,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    right: point.x + AVATAR_SIZE,
    bottom: point.y + AVATAR_SIZE,
  };
};

const getAttachedAvatarRect = (input: {
  panelLeft: number;
  panelTop: number;
  panelWidth: number;
  side: TutorAvatarAttachmentSide;
}): RectLike => {
  const avatarLeft =
    input.side === 'left'
      ? input.panelLeft - ATTACHED_AVATAR_OVERLAP
      : input.panelLeft + input.panelWidth - AVATAR_SIZE + ATTACHED_AVATAR_OVERLAP;

  return {
    left: avatarLeft,
    top: input.panelTop + ATTACHED_AVATAR_EDGE_INSET,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    right: avatarLeft + AVATAR_SIZE,
    bottom: input.panelTop + ATTACHED_AVATAR_EDGE_INSET + AVATAR_SIZE,
  };
};

const getDockLaunchOffset = (input: {
  finalLeft: number;
  finalTop: number;
  side: TutorAvatarAttachmentSide;
  viewport: { width: number; height: number };
  width: number;
}): { x: number; y: number } => {
  const dockRect = getDockAvatarRect(input.viewport);
  const dockCenterX = dockRect.left + dockRect.width / 2;
  const dockCenterY = dockRect.top + dockRect.height / 2;
  const avatarCenterOffsetX =
    input.side === 'left'
      ? AVATAR_SIZE / 2 - ATTACHED_AVATAR_OVERLAP
      : input.width - (AVATAR_SIZE / 2 - ATTACHED_AVATAR_OVERLAP);
  const avatarCenterOffsetY = ATTACHED_AVATAR_EDGE_INSET + AVATAR_SIZE / 2;
  const launchPanelLeft = dockCenterX - avatarCenterOffsetX;
  const launchPanelTop = dockCenterY - avatarCenterOffsetY;

  return {
    x: launchPanelLeft - input.finalLeft,
    y: launchPanelTop - input.finalTop,
  };
};

const getAttachedAvatarSide = (input: {
  mode: 'bubble' | 'sheet';
  panelLeft?: number;
  panelWidth?: number;
  rect: DOMRect | null;
  strategy: TutorBubblePlacementStrategy;
}): TutorAvatarAttachmentSide => {
  if (input.mode === 'sheet' || !input.rect) {
    return 'left';
  }

  if (typeof input.panelLeft === 'number' && typeof input.panelWidth === 'number') {
    const panelCenterX = input.panelLeft + input.panelWidth / 2;
    const focusCenterX = input.rect.left + input.rect.width / 2;
    return focusCenterX <= panelCenterX ? 'left' : 'right';
  }

  if (
    input.strategy === 'right' ||
    input.strategy === 'top-right' ||
    input.strategy === 'bottom-right'
  ) {
    return 'left';
  }

  if (
    input.strategy === 'left' ||
    input.strategy === 'top-left' ||
    input.strategy === 'bottom-left'
  ) {
    return 'right';
  }

  return 'left';
};

const getAttachedAvatarStyle = (side: TutorAvatarAttachmentSide): CSSProperties => ({
  position: 'absolute',
  top: ATTACHED_AVATAR_EDGE_INSET,
  ...(side === 'left' ? { left: -ATTACHED_AVATAR_OVERLAP } : { right: -ATTACHED_AVATAR_OVERLAP }),
});

const getTutorPointerGeometry = (input: {
  focusRect: DOMRect | null;
  panelLeft: number;
  panelTop: number;
  panelWidth: number;
  side: TutorPointerSide;
}): AvatarPointer | null => {
  if (!input.focusRect) {
    return null;
  }

  const avatarRect = getAttachedAvatarRect({
    panelLeft: input.panelLeft,
    panelTop: input.panelTop,
    panelWidth: input.panelWidth,
    side: input.side,
  });
  const originX =
    input.side === 'left'
      ? avatarRect.left + ATTACHED_AVATAR_POINTER_EDGE_INSET
      : avatarRect.right - ATTACHED_AVATAR_POINTER_EDGE_INSET;
  const originY = avatarRect.top + avatarRect.height / 2;
  const verticalInset = Math.min(10, input.focusRect.height / 2);
  const minTargetY = input.focusRect.top + verticalInset;
  const maxTargetY = input.focusRect.bottom - verticalInset;
  const targetY =
    minTargetY <= maxTargetY
      ? clamp(originY, minTargetY, maxTargetY)
      : input.focusRect.top + input.focusRect.height / 2;
  const targetX = input.side === 'left' ? input.focusRect.right : input.focusRect.left;
  const left = Math.min(originX, targetX) - ATTACHED_AVATAR_POINTER_PADDING;
  const top = Math.min(originY, targetY) - ATTACHED_AVATAR_POINTER_PADDING;
  const width = Math.max(Math.abs(targetX - originX), 1) + ATTACHED_AVATAR_POINTER_PADDING * 2;
  const height = Math.max(Math.abs(targetY - originY), 1) + ATTACHED_AVATAR_POINTER_PADDING * 2;

  return {
    left,
    top,
    width,
    height,
    side: input.side,
    start: {
      x: originX - left,
      y: originY - top,
    },
    end: {
      x: targetX - left,
      y: targetY - top,
    },
  };
};

export function useKangurAiTutorPanelShellState(input: {
  activeFocusKind: string | null;
  askModalDockStyle:
    | {
        bottom?: number | string;
        left?: number | string;
        right?: number | string;
        top?: number | string;
      }
    | null;
  bubblePlacement: BubblePlacement;
  displayFocusRect: DOMRect | null;
  draggedAvatarPoint: PanelShellPoint | null;
  guidedAvatarStyle: TutorMotionPosition | null;
  guidedFocusRect: DOMRect | null;
  guidedMode: 'home_onboarding' | 'selection' | 'section' | 'auth' | null;
  guidedTutorTarget: GuidedTutorTargetLike;
  homeOnboardingStepKind: string | null;
  isAnchoredUiMode: boolean;
  isAskModalMode: boolean;
  isContextualPanelAnchor: boolean;
  isGuidedTutorMode: boolean;
  isOpen: boolean;
  isStaticUiMode: boolean;
  isTutorHidden: boolean;
  motionProfile: TutorMotionProfile;
  prefersReducedMotion: boolean;
  reducedMotionTransitions: ReducedMotionTransitions;
  showSectionGuidanceCallout: boolean;
  showSelectionGuidanceCallout: boolean;
  viewport: { width: number; height: number };
}): PanelShellState {
  const {
    activeFocusKind,
    askModalDockStyle,
    bubblePlacement,
    displayFocusRect,
    draggedAvatarPoint,
    guidedAvatarStyle,
    guidedFocusRect,
    guidedMode,
    guidedTutorTarget,
    homeOnboardingStepKind,
    isAnchoredUiMode,
    isAskModalMode,
    isContextualPanelAnchor,
    isGuidedTutorMode,
    isOpen,
    isStaticUiMode,
    isTutorHidden,
    motionProfile,
    prefersReducedMotion,
    reducedMotionTransitions,
    showSectionGuidanceCallout,
    showSelectionGuidanceCallout,
    viewport,
  } = input;

  const shouldPreserveInlineGuidanceAvatar =
    showSelectionGuidanceCallout || showSectionGuidanceCallout;
  const showAttachedAvatarShell =
    !isTutorHidden &&
    isOpen &&
    isAnchoredUiMode &&
    isContextualPanelAnchor &&
    !isGuidedTutorMode &&
    !shouldPreserveInlineGuidanceAvatar &&
    !isAskModalMode;
  const hideFloatingAvatar = isOpen && isStaticUiMode && !isAskModalMode;
  const showFloatingAvatar =
    !isTutorHidden &&
    (
      isAskModalMode ||
      isGuidedTutorMode ||
      shouldPreserveInlineGuidanceAvatar ||
      (!showAttachedAvatarShell && !hideFloatingAvatar)
    );
  const avatarAttachmentSide = getAttachedAvatarSide({
    rect: displayFocusRect,
    mode: bubblePlacement.mode,
    panelLeft:
      typeof bubblePlacement.style['left'] === 'number' ? bubblePlacement.style['left'] : undefined,
    panelWidth: bubblePlacement.width,
    strategy: bubblePlacement.strategy,
  });
  const attachedAvatarStyle = getAttachedAvatarStyle(avatarAttachmentSide);
  const avatarPointer =
    bubblePlacement.mode === 'bubble' &&
    isAnchoredUiMode &&
    displayFocusRect &&
    typeof bubblePlacement.style['left'] === 'number' &&
    typeof bubblePlacement.style['top'] === 'number'
      ? getTutorPointerGeometry({
        focusRect: displayFocusRect,
        panelLeft: bubblePlacement.style['left'],
        panelTop: bubblePlacement.style['top'],
        panelWidth: bubblePlacement.width ?? motionProfile.desktopBubbleWidth,
        side: avatarAttachmentSide,
      })
      : null;
  const attachedLaunchOffset =
    bubblePlacement.mode === 'bubble' &&
    typeof bubblePlacement.style['left'] === 'number' &&
    typeof bubblePlacement.style['top'] === 'number'
      ? getDockLaunchOffset({
        finalLeft: bubblePlacement.style['left'],
        finalTop: bubblePlacement.style['top'],
        width: bubblePlacement.width ?? motionProfile.desktopBubbleWidth,
        side: avatarAttachmentSide,
        viewport,
      })
      : { x: 0, y: 0 };
  const baseAvatarStyle =
    isAskModalMode && askModalDockStyle
      ? askModalDockStyle
      : showAttachedAvatarShell || (isOpen && bubblePlacement.mode === 'sheet')
        ? getDockAvatarStyle(viewport)
        : isOpen && displayFocusRect
          ? {
            left: clamp(
              displayFocusRect.left + displayFocusRect.width / 2 - AVATAR_SIZE / 2,
              EDGE_GAP,
              viewport.width - EDGE_GAP - AVATAR_SIZE
            ),
            top:
                displayFocusRect.top - AVATAR_SIZE - 12 >= EDGE_GAP
                  ? displayFocusRect.top - AVATAR_SIZE - 12
                  : clamp(
                    displayFocusRect.bottom + 12,
                    EDGE_GAP,
                    viewport.height - EDGE_GAP - AVATAR_SIZE
                  ),
          }
          : getDockAvatarStyle(viewport);
  const avatarStyle = guidedAvatarStyle
    ? guidedAvatarStyle
    : isAskModalMode && askModalDockStyle
      ? askModalDockStyle
      : draggedAvatarPoint
        ? {
          left: draggedAvatarPoint.x,
          top: draggedAvatarPoint.y,
        }
        : baseAvatarStyle;
  const avatarAnchorKind =
    guidedMode === 'home_onboarding' && homeOnboardingStepKind && guidedFocusRect
      ? homeOnboardingStepKind
      : guidedTutorTarget && guidedFocusRect
        ? guidedTutorTarget.kind
        : isOpen && isAnchoredUiMode && isContextualPanelAnchor
          ? (activeFocusKind ?? 'dock')
          : 'dock';
  const pointerMarkerId = `kangur-ai-tutor-pointer-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const panelAvatarPlacement = showAttachedAvatarShell
    ? 'attached'
    : hideFloatingAvatar
      ? 'hidden'
      : 'independent';
  const floatingAvatarPlacement = isAskModalMode
    ? 'ask-modal'
    : (isGuidedTutorMode || shouldPreserveInlineGuidanceAvatar) && guidedFocusRect
      ? 'guided'
      : 'floating';
  const panelOpenAnimation: 'dock-launch' | 'fade' | 'sheet' =
    bubblePlacement.mode === 'sheet' ? 'sheet' : isStaticUiMode ? 'fade' : 'dock-launch';
  const panelTransition: Transition = prefersReducedMotion
    ? reducedMotionTransitions.instant
    : panelOpenAnimation === 'fade'
      ? { duration: 0.2, ease: 'easeOut' }
      : motionProfile.bubbleTransition;

  return {
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
  };
}
