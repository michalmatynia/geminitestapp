'use client';

import { useId, type CSSProperties } from 'react';

import type { Point2d } from '@/shared/contracts/geometry';
import {
  ATTACHED_AVATAR_EDGE_INSET,
  ATTACHED_AVATAR_OVERLAP,
  ATTACHED_AVATAR_POINTER_EDGE_INSET,
  ATTACHED_AVATAR_POINTER_PADDING,
  AVATAR_SIZE,
  BUBBLE_MAX_HEIGHT,
  BUBBLE_MIN_HEIGHT,
  EDGE_GAP,
  applyTutorPanelSnapState,
  clampTutorPanelPoint,
  getTutorPanelSnapState,
  type TutorAvatarPointer,
  type TutorBubblePlacementStrategy,
  type TutorHorizontalSide,
  type TutorMotionPosition,
  type TutorMotionProfile,
  type TutorPanelSnapState,
  type TutorReducedMotionAvatarTransitions,
} from './KangurAiTutorWidget.shared';
import { getAttachedAvatarRectForSurface } from './KangurAiTutorAvatarAttachment';

import type { Transition } from 'framer-motion';

type BubblePlacement = {
  launchOrigin: 'dock-bottom-right' | 'sheet';
  mode: 'bubble' | 'sheet';
  strategy: TutorBubblePlacementStrategy;
  style: Record<string, number | string | undefined>;
  width?: number;
};

type GuidedTutorTargetLike = {
  kind: string;
} | null;

type RectLike = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

type PanelShellState = {
  attachedAvatarStyle: CSSProperties;
  attachedLaunchOffset: Point2d;
  avatarAnchorKind: string;
  avatarAttachmentSide: TutorHorizontalSide;
  avatarPointer: TutorAvatarPointer | null;
  avatarStyle: TutorMotionPosition;
  floatingAvatarPlacement: 'ask-modal' | 'guided' | 'floating';
  isPanelDraggable: boolean;
  isPanelDragging: boolean;
  panelAvatarPlacement: 'attached' | 'hidden' | 'independent';
  panelBubbleStyle: Record<string, number | string | undefined>;
  panelOpenAnimation: 'dock-launch' | 'fade' | 'sheet';
  panelSnapState: TutorPanelSnapState | 'none';
  panelTransition: Transition;
  pointerMarkerId: string;
  showAttachedAvatarShell: boolean;
  showFloatingAvatar: boolean;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const getDockAvatarPoint = (viewport: { width: number; height: number }): Point2d => ({
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

const getDockLaunchOffset = (input: {
  finalLeft: number;
  finalTop: number;
  side: TutorHorizontalSide;
  viewport: { width: number; height: number };
  width: number;
}): Point2d => {
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
}): TutorHorizontalSide => {
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

const getAttachedAvatarStyle = (side: TutorHorizontalSide): CSSProperties => ({
  position: 'absolute',
  top: ATTACHED_AVATAR_EDGE_INSET,
  ...(side === 'left' ? { left: -ATTACHED_AVATAR_OVERLAP } : { right: -ATTACHED_AVATAR_OVERLAP }),
});

const getTutorPointerGeometry = (input: {
  focusRect: DOMRect | null;
  panelLeft: number;
  panelTop: number;
  panelWidth: number;
  side: TutorHorizontalSide;
}): TutorAvatarPointer | null => {
  if (!input.focusRect) {
    return null;
  }

  const avatarRect = getAttachedAvatarRectForSurface({
    placement: input.side,
    surface: {
      left: input.panelLeft,
      top: input.panelTop,
      width: input.panelWidth,
    },
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
  compactDockedTutorPanelWidth: number;
  contextualTutorMode: 'selection_explain' | 'section_explain' | null;
  displayFocusRect: DOMRect | null;
  draggedAvatarPoint: Point2d | null;
  guidedAvatarStyle: TutorMotionPosition | null;
  guidedFocusRect: DOMRect | null;
  guidedMode: 'home_onboarding' | 'selection' | 'section' | 'auth' | null;
  guidedTutorTarget: GuidedTutorTargetLike;
  hasContextualVisibilityFallback: boolean;
  homeOnboardingStepKind: string | null;
  isAnchoredUiMode: boolean;
  isAvatarDragging: boolean;
  isCompactDockedTutorPanel: boolean;
  isAskModalMode: boolean;
  isContextualPanelAnchor: boolean;
  isFreeformUiMode: boolean;
  isGuidedTutorMode: boolean;
  isOpen: boolean;
  isPanelDragging: boolean;
  isStaticUiMode: boolean;
  isTutorHidden: boolean;
  motionProfile: TutorMotionProfile;
  panelMeasuredHeight: number | null;
  panelPosition: Point2d | null;
  panelShellMode: 'default' | 'minimal';
  panelSnapPreference: TutorPanelSnapState;
  prefersReducedMotion: boolean;
  reducedMotionTransitions: TutorReducedMotionAvatarTransitions;
  showSectionGuidanceCallout: boolean;
  showSelectionGuidanceCallout: boolean;
  viewport: { width: number; height: number };
}): PanelShellState {
  const {
    activeFocusKind,
    askModalDockStyle,
    bubblePlacement,
    compactDockedTutorPanelWidth,
    contextualTutorMode,
    displayFocusRect,
    draggedAvatarPoint,
    guidedAvatarStyle,
    guidedFocusRect,
    guidedMode,
    guidedTutorTarget,
    hasContextualVisibilityFallback,
    homeOnboardingStepKind,
    isAnchoredUiMode,
    isAvatarDragging,
    isCompactDockedTutorPanel,
    isAskModalMode,
    isContextualPanelAnchor,
    isFreeformUiMode,
    isGuidedTutorMode,
    isOpen,
    isPanelDragging,
    isStaticUiMode,
    isTutorHidden,
    motionProfile,
    panelMeasuredHeight,
    panelPosition,
    panelShellMode,
    panelSnapPreference,
    prefersReducedMotion,
    reducedMotionTransitions,
    showSectionGuidanceCallout,
    showSelectionGuidanceCallout,
    viewport,
  } = input;

  const shouldPreserveInlineGuidanceAvatar =
    showSelectionGuidanceCallout || showSectionGuidanceCallout;
  const isFreeformPanel =
    isFreeformUiMode &&
    isOpen &&
    bubblePlacement.mode === 'bubble' &&
    !isAskModalMode &&
    !isGuidedTutorMode &&
    !shouldPreserveInlineGuidanceAvatar;

  const showAttachedAvatarShell =
    !isTutorHidden &&
    isOpen &&
    isAnchoredUiMode &&
    isContextualPanelAnchor &&
    !isGuidedTutorMode &&
    !shouldPreserveInlineGuidanceAvatar &&
    !isAskModalMode;
  const hideFloatingAvatar =
    isOpen &&
    (isStaticUiMode || isFreeformUiMode) &&
    !isAskModalMode &&
    !hasContextualVisibilityFallback;
  const showFloatingAvatar =
    !isTutorHidden &&
    (
      isAskModalMode ||
      isGuidedTutorMode ||
      shouldPreserveInlineGuidanceAvatar ||
      (!showAttachedAvatarShell && !hideFloatingAvatar)
    );
  const resolvedPanelWidth = isCompactDockedTutorPanel
    ? compactDockedTutorPanelWidth
    : bubblePlacement.width ?? motionProfile.desktopBubbleWidth;
  const resolvedPanelHeight =
    panelMeasuredHeight && panelMeasuredHeight > 0
      ? panelMeasuredHeight
      : Math.min(Math.max(BUBBLE_MIN_HEIGHT, viewport.height - EDGE_GAP * 2), BUBBLE_MAX_HEIGHT);
  const fallbackPanelPoint = {
    x:
      typeof bubblePlacement.style['left'] === 'number'
        ? bubblePlacement.style['left']
        : viewport.width - EDGE_GAP - resolvedPanelWidth,
    y:
      typeof bubblePlacement.style['top'] === 'number'
        ? bubblePlacement.style['top']
        : clamp(
            viewport.height - resolvedPanelHeight - EDGE_GAP,
            EDGE_GAP,
            Math.max(EDGE_GAP, viewport.height - EDGE_GAP - resolvedPanelHeight)
          ),
  };
  const resolvedPanelPoint = isFreeformPanel
    ? panelSnapPreference === 'free'
      ? clampTutorPanelPoint(panelPosition ?? fallbackPanelPoint, viewport, {
          width: resolvedPanelWidth,
          height: resolvedPanelHeight,
        })
      : applyTutorPanelSnapState(
          panelPosition ?? fallbackPanelPoint,
          panelSnapPreference,
          viewport,
          {
            width: resolvedPanelWidth,
            height: resolvedPanelHeight,
          }
        )
    : null;
  const panelBubbleStyle: Record<string, number | string | undefined> = isFreeformPanel
    ? {
        ...bubblePlacement.style,
        left: resolvedPanelPoint?.x,
        top: resolvedPanelPoint?.y,
        right: undefined,
        bottom: undefined,
      }
    : bubblePlacement.style;
  const panelSnapState =
    isFreeformPanel && resolvedPanelPoint
      ? getTutorPanelSnapState(resolvedPanelPoint, viewport, {
          width: resolvedPanelWidth,
          height: resolvedPanelHeight,
        })
      : 'none';
  const avatarAttachmentSide = getAttachedAvatarSide({
    rect: displayFocusRect,
    mode: bubblePlacement.mode,
    panelLeft:
      typeof panelBubbleStyle['left'] === 'number' ? panelBubbleStyle['left'] : undefined,
    panelWidth: resolvedPanelWidth,
    strategy: bubblePlacement.strategy,
  });
  const attachedAvatarStyle = getAttachedAvatarStyle(avatarAttachmentSide);
  const avatarPointer =
    bubblePlacement.mode === 'bubble' &&
    isAnchoredUiMode &&
    displayFocusRect &&
    typeof panelBubbleStyle['left'] === 'number' &&
    typeof panelBubbleStyle['top'] === 'number'
      ? getTutorPointerGeometry({
        focusRect: displayFocusRect,
        panelLeft: panelBubbleStyle['left'],
        panelTop: panelBubbleStyle['top'],
        panelWidth: resolvedPanelWidth,
        side: avatarAttachmentSide,
      })
      : null;
  const attachedLaunchOffset =
    bubblePlacement.mode === 'bubble' &&
    typeof panelBubbleStyle['left'] === 'number' &&
    typeof panelBubbleStyle['top'] === 'number'
      ? getDockLaunchOffset({
        finalLeft: panelBubbleStyle['left'],
        finalTop: panelBubbleStyle['top'],
        width: resolvedPanelWidth,
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
  const clampedDraggedAvatarPoint = draggedAvatarPoint
    ? {
      x: clamp(
        draggedAvatarPoint.x,
        EDGE_GAP,
        Math.max(EDGE_GAP, viewport.width - EDGE_GAP - AVATAR_SIZE)
      ),
      y: clamp(
        draggedAvatarPoint.y,
        EDGE_GAP,
        Math.max(EDGE_GAP, viewport.height - EDGE_GAP - AVATAR_SIZE)
      ),
    }
    : null;
  const avatarStyle = guidedAvatarStyle
    ? guidedAvatarStyle
    : isAskModalMode && askModalDockStyle
      ? askModalDockStyle
      : isAvatarDragging && clampedDraggedAvatarPoint
        ? {
          left: clampedDraggedAvatarPoint.x,
          top: clampedDraggedAvatarPoint.y,
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
  const shouldFadeDeferredSelectionPanel =
    panelShellMode === 'minimal' && contextualTutorMode === 'selection_explain';
  const panelOpenAnimation: 'dock-launch' | 'fade' | 'sheet' =
    bubblePlacement.mode === 'sheet'
      ? 'sheet'
      : isStaticUiMode || isFreeformUiMode || shouldFadeDeferredSelectionPanel
        ? 'fade'
        : 'dock-launch';
  const panelTransition: Transition = prefersReducedMotion
    ? reducedMotionTransitions.instant
    : panelOpenAnimation === 'fade'
      ? { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
      : motionProfile.bubbleTransition;

  return {
    attachedAvatarStyle,
    attachedLaunchOffset,
    avatarAnchorKind,
    avatarAttachmentSide,
    avatarPointer,
    avatarStyle,
    floatingAvatarPlacement,
    isPanelDraggable: isFreeformPanel,
    isPanelDragging: isFreeformPanel && isPanelDragging,
    panelAvatarPlacement,
    panelBubbleStyle,
    panelOpenAnimation,
    panelSnapState,
    panelTransition,
    pointerMarkerId,
    showAttachedAvatarShell,
    showFloatingAvatar,
  };
}
