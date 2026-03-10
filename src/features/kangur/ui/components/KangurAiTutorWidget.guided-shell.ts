'use client';

import { useEffect, useMemo, useRef } from 'react';

import {
  formatGuidedArrowheadTransition,
  getAvatarRectFromPoint,
  getFloatingTutorArrowCorridorRect,
  getFloatingTutorArrowheadGeometry,
  getGuidedCalloutLayout,
  getMotionPositionPoint,
  getSelectionSpotlightStyle,
  resolveContinuousRotationDegrees,
} from './KangurAiTutorGuidedLayout';
import { AVATAR_SIZE, EDGE_GAP, type TutorMotionPosition, type TutorMotionProfile } from './KangurAiTutorWidget.shared';

type GuidedMode = 'home_onboarding' | 'selection' | 'section' | 'auth' | null;
type GuidedPlacement = 'top' | 'bottom' | 'left' | 'right';
type GuidedShellState = {
  guidedArrowheadTransition: string | undefined;
  guidedAvatarArrowhead: ReturnType<typeof getFloatingTutorArrowheadGeometry>;
  guidedAvatarArrowheadDisplayAngle: number | null;
  guidedAvatarArrowheadDisplayAngleLabel: string | undefined;
  guidedAvatarLayout: { style: TutorMotionPosition; placement: GuidedPlacement } | null;
  guidedAvatarStyle: TutorMotionPosition | null;
  guidedCalloutLayout: ReturnType<typeof getGuidedCalloutLayout> | null;
  guidedCalloutStyle: ReturnType<typeof getGuidedCalloutLayout>['style'] | null;
  guidedCalloutTransitionDuration: number;
  isGuidedTutorMode: boolean;
  sectionContextSpotlightStyle: ReturnType<typeof getSelectionSpotlightStyle> | null;
  sectionDropHighlightStyle: ReturnType<typeof getSelectionSpotlightStyle> | null;
  selectionContextSpotlightStyle: ReturnType<typeof getSelectionSpotlightStyle> | null;
  selectionSpotlightStyle: ReturnType<typeof getSelectionSpotlightStyle> | null;
  shouldRenderGuidedCallout: boolean;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

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

const getRectOverlapArea = (left: DOMRect, right: DOMRect): number => {
  const overlapWidth = Math.max(
    0,
    Math.min(left.right, right.right) - Math.max(left.left, right.left)
  );
  const overlapHeight = Math.max(
    0,
    Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top)
  );
  return overlapWidth * overlapHeight;
};

const getAnchorAvatarStyle = (
  rect: DOMRect,
  viewport: { width: number; height: number }
): TutorMotionPosition => {
  const left = clamp(
    rect.left + rect.width / 2 - AVATAR_SIZE / 2,
    EDGE_GAP,
    viewport.width - EDGE_GAP - AVATAR_SIZE
  );
  const preferredTop = rect.top - AVATAR_SIZE - 12;
  const fallbackTop = rect.bottom + 12;
  const top =
    preferredTop >= EDGE_GAP
      ? preferredTop
      : clamp(fallbackTop, EDGE_GAP, viewport.height - EDGE_GAP - AVATAR_SIZE);

  return {
    left,
    top,
  };
};

const getGuidedAvatarLayout = (
  rect: DOMRect,
  viewport: { width: number; height: number }
): { style: TutorMotionPosition; placement: GuidedPlacement } => {
  const gap = 12;
  const maxLeft = viewport.width - EDGE_GAP - AVATAR_SIZE;
  const maxTop = viewport.height - EDGE_GAP - AVATAR_SIZE;
  const centeredLeft = rect.left + rect.width / 2 - AVATAR_SIZE / 2;
  const centeredTop = rect.top + rect.height / 2 - AVATAR_SIZE / 2;
  const candidates: Array<{
    placement: 'top' | 'bottom' | 'left' | 'right';
    left: number;
    top: number;
    priority: number;
  }> = [
    {
      placement: 'top',
      left: centeredLeft,
      top: rect.top - AVATAR_SIZE - gap,
      priority: 0,
    },
    {
      placement: 'bottom',
      left: centeredLeft,
      top: rect.bottom + gap,
      priority: 1,
    },
    {
      placement: 'right',
      left: rect.right + gap,
      top: centeredTop,
      priority: 2,
    },
    {
      placement: 'left',
      left: rect.left - AVATAR_SIZE - gap,
      top: centeredTop,
      priority: 3,
    },
  ];

  const bestCandidate = candidates
    .map((candidate) => {
      const left = clamp(candidate.left, EDGE_GAP, maxLeft);
      const top = clamp(candidate.top, EDGE_GAP, maxTop);
      const avatarRect = createRect(left, top, AVATAR_SIZE, AVATAR_SIZE);
      const overlapArea = getRectOverlapArea(avatarRect, rect);
      const repositionCost = Math.hypot(candidate.left - left, candidate.top - top);
      const score = overlapArea * 18 + repositionCost * 0.75 + candidate.priority * 22;

      return {
        placement: candidate.placement,
        left,
        top,
        overlapArea,
        score,
      };
    })
    .sort((leftCandidate, rightCandidate) => {
      const leftHasOverlap = leftCandidate.overlapArea > 0 ? 1 : 0;
      const rightHasOverlap = rightCandidate.overlapArea > 0 ? 1 : 0;
      if (leftHasOverlap !== rightHasOverlap) {
        return leftHasOverlap - rightHasOverlap;
      }

      if (leftCandidate.overlapArea !== rightCandidate.overlapArea) {
        return leftCandidate.overlapArea - rightCandidate.overlapArea;
      }

      return leftCandidate.score - rightCandidate.score;
    })[0] ?? {
    placement: 'bottom' as const,
    left: clamp(centeredLeft, EDGE_GAP, maxLeft),
    top: clamp(rect.bottom + gap, EDGE_GAP, maxTop),
    overlapArea: 0,
    score: 0,
  };

  return {
    placement: bestCandidate.placement,
    style: {
      left: bestCandidate.left,
      top: bestCandidate.top,
    },
  };
};

export function useKangurAiTutorGuidedShellState(input: {
  activeSectionProtectedRect: DOMRect | null;
  activeSelectionProtectedRect: DOMRect | null;
  guidedFocusRect: DOMRect | null;
  guidedMode: GuidedMode;
  guidedSelectionSpotlightRect: DOMRect | null;
  hoveredSectionProtectedRect: DOMRect | null;
  isAnonymousVisitor: boolean;
  isAskModalMode: boolean;
  isAvatarDragging: boolean;
  isContextualPanelAnchor: boolean;
  isOpen: boolean;
  isTutorHidden: boolean;
  motionProfile: TutorMotionProfile;
  prefersReducedMotion: boolean;
  showSectionGuidanceCallout: boolean;
  showSelectionGuidanceCallout: boolean;
  viewport: { width: number; height: number };
}): GuidedShellState {
  const {
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
    isOpen,
    isTutorHidden,
    motionProfile,
    prefersReducedMotion,
    showSectionGuidanceCallout,
    showSelectionGuidanceCallout,
    viewport,
  } = input;

  const shouldUseSelectionGuidedAvatar = showSelectionGuidanceCallout && guidedFocusRect;
  const guidedAvatarSelectionProtectedRect =
    shouldUseSelectionGuidedAvatar
      ? createRect(
        guidedFocusRect.left - 72,
        guidedFocusRect.top - 56,
        guidedFocusRect.width + 144,
        guidedFocusRect.height + 112
      )
      : null;
  const guidedAvatarLayout =
    shouldUseSelectionGuidedAvatar && guidedAvatarSelectionProtectedRect
      ? getGuidedAvatarLayout(guidedAvatarSelectionProtectedRect, viewport)
      : guidedFocusRect
        ? { placement: 'top' as const, style: getAnchorAvatarStyle(guidedFocusRect, viewport) }
        : null;
  const guidedAvatarStyle = guidedAvatarLayout?.style ?? null;
  const guidedAvatarPoint = getMotionPositionPoint(guidedAvatarStyle);
  const guidedAvatarArrowhead = getFloatingTutorArrowheadGeometry({
    avatarPoint: guidedAvatarPoint,
    focusRect: guidedFocusRect,
  });
  const guidedArrowheadRenderAngleRef = useRef<number | null>(null);
  const guidedAvatarArrowheadRenderAngle = useMemo(() => {
    if (!guidedAvatarArrowhead) {
      return null;
    }

    return resolveContinuousRotationDegrees(
      guidedArrowheadRenderAngleRef.current,
      guidedAvatarArrowhead.angle
    );
  }, [guidedAvatarArrowhead]);

  useEffect(() => {
    guidedArrowheadRenderAngleRef.current = guidedAvatarArrowheadRenderAngle;
  }, [guidedAvatarArrowheadRenderAngle]);

  const guidedArrowheadTransition = useMemo(
    () => formatGuidedArrowheadTransition(motionProfile, prefersReducedMotion),
    [motionProfile, prefersReducedMotion]
  );
  const guidedAvatarArrowheadDisplayAngle =
    guidedAvatarArrowheadRenderAngle ?? guidedAvatarArrowhead?.angle ?? null;
  const guidedAvatarArrowheadDisplayAngleLabel =
    guidedAvatarArrowheadDisplayAngle !== null
      ? guidedAvatarArrowheadDisplayAngle.toFixed(2)
      : undefined;
  const guidedAvatarRect =
    shouldUseSelectionGuidedAvatar && guidedAvatarPoint
      ? getAvatarRectFromPoint(guidedAvatarPoint)
      : null;
  const guidedAvatarArrowCorridorRect =
    shouldUseSelectionGuidedAvatar
      ? getFloatingTutorArrowCorridorRect({
        avatarPoint: guidedAvatarPoint,
        arrowhead: guidedAvatarArrowhead,
      })
      : null;
  const guidedCalloutLayout = guidedFocusRect
    ? getGuidedCalloutLayout(
      guidedFocusRect,
      viewport,
      [guidedAvatarRect, guidedAvatarArrowCorridorRect].filter((rect): rect is DOMRect =>
        Boolean(rect)
      )
    )
    : null;
  const guidedCalloutStyle = guidedCalloutLayout?.style ?? null;
  const shouldRenderGuidedCallout =
    !isTutorHidden &&
    (guidedMode !== null || showSelectionGuidanceCallout || showSectionGuidanceCallout) &&
    Boolean(guidedFocusRect && guidedCalloutStyle) &&
    (guidedMode === 'home_onboarding' ||
      showSectionGuidanceCallout ||
      showSelectionGuidanceCallout ||
      isAnonymousVisitor);
  const guidedCalloutTransitionDuration = Math.max(
    0.34,
    motionProfile.guidedAvatarTransition.duration * 0.78
  );
  const selectionSpotlightStyle =
    showSelectionGuidanceCallout && guidedSelectionSpotlightRect
      ? getSelectionSpotlightStyle(guidedSelectionSpotlightRect)
      : null;
  const isGuidedTutorMode = !isTutorHidden && guidedMode !== null;
  const selectionContextSpotlightStyle =
    !isGuidedTutorMode &&
    !isAskModalMode &&
    isOpen &&
    isContextualPanelAnchor &&
    activeSelectionProtectedRect
      ? getSelectionSpotlightStyle(activeSelectionProtectedRect)
      : null;
  const sectionContextSpotlightStyle =
    !isGuidedTutorMode &&
    !isAskModalMode &&
    isOpen &&
    isContextualPanelAnchor &&
    activeSectionProtectedRect
      ? getSelectionSpotlightStyle(activeSectionProtectedRect)
      : null;
  const sectionDropHighlightStyle =
    !isOpen && isAvatarDragging && hoveredSectionProtectedRect
      ? getSelectionSpotlightStyle(hoveredSectionProtectedRect)
      : null;

  return {
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
  };
}
