
import {
  getGuidedAvatarAttachmentPlacement,
} from './KangurAiTutorAvatarAttachment';
import {
  ATTACHED_AVATAR_EDGE_INSET,
  AVATAR_SIZE,
  BUBBLE_MAX_HEIGHT,
  BUBBLE_MIN_HEIGHT,
  EDGE_GAP,
  GUIDED_AVATAR_SURFACE_GAP,
  type TutorGuidedArrowhead,
  type TutorHorizontalSide,
  type TutorMotionPosition,
  type TutorMotionProfile,
  getTutorEntryDirection
  } from './ai-tutor-widget/KangurAiTutorWidget.shared';

import type { TutorPoint } from './ai-tutor-widget/KangurAiTutorWidget.types';
import type { CSSProperties } from 'react';

const FLOATING_TUTOR_ARROWHEAD_ANCHOR_X = 12.5;
const FLOATING_TUTOR_ARROWHEAD_ANCHOR_Y = 9;
const FLOATING_TUTOR_ARROWHEAD_DOT_RADIUS_PX = 3.2;
const FLOATING_TUTOR_ARROWHEAD_ROTATION_OFFSET_DEG = 180;
const FLOATING_TUTOR_ARROWHEAD_RIM_INSET_PX = FLOATING_TUTOR_ARROWHEAD_DOT_RADIUS_PX + 1;
const FLOATING_TUTOR_ARROWHEAD_CORRIDOR_PADDING_PX = 18;
const GUIDED_ARROWHEAD_MIN_TRANSITION_DURATION_S = 0.22;
export const GUIDED_CALLOUT_HEIGHT = 260;
const GUIDED_CALLOUT_FOCUS_GAP = 28;
const GUIDED_SELECTION_CALLOUT_ATTACHMENT_HEIGHT_MAX = 255;
const GUIDED_SELECTION_CALLOUT_ATTACHMENT_HEIGHT_MIN = 219;
const GUIDED_SELECTION_KNOWLEDGE_CONTEXT_EXTRA_HEIGHT = 104;
const GUIDED_SELECTION_RESOLVED_ANSWER_EXTRA_HEIGHT = 124;
const GUIDED_SELECTION_PREVIEW_HEIGHT = 36;
const GUIDED_SELECTION_PREVIEW_EDGE_INSET_X = 20;
const GUIDED_SELECTION_PREVIEW_TOP_OFFSET = 122;
const GUIDED_SELECTION_PREVIEW_SAFE_DISTANCE = 32;
const GUIDED_SELECTION_AVATAR_SURFACE_GAP = 4;

type FloatingTutorArrowheadGeometry = TutorGuidedArrowhead;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const getGuidedAvatarRectForCallout = (input: {
  focusRect?: DOMRect | null;
  placement: ReturnType<typeof getGuidedAvatarAttachmentPlacement>;
  surface: DOMRect;
  surfaceGap?: number;
}): DOMRect => {
  const { focusRect, placement, surface, surfaceGap = GUIDED_AVATAR_SURFACE_GAP } = input;
  const minLeft = surface.left + ATTACHED_AVATAR_EDGE_INSET;
  const maxLeft = surface.right - ATTACHED_AVATAR_EDGE_INSET - AVATAR_SIZE;
  const minTop = surface.top + ATTACHED_AVATAR_EDGE_INSET;
  const maxTop = surface.bottom - ATTACHED_AVATAR_EDGE_INSET - AVATAR_SIZE;
  const alignedLeft = clamp(
    (focusRect?.left ?? surface.left) + (focusRect?.width ?? AVATAR_SIZE) / 2 - AVATAR_SIZE / 2,
    minLeft,
    Math.max(minLeft, maxLeft)
  );
  const alignedTop = clamp(
    (focusRect?.top ?? surface.top) + (focusRect?.height ?? AVATAR_SIZE) / 2 - AVATAR_SIZE / 2,
    minTop,
    Math.max(minTop, maxTop)
  );

  switch (placement) {
    case 'left':
      return createRect(
        surface.left - surfaceGap - AVATAR_SIZE,
        alignedTop,
        AVATAR_SIZE,
        AVATAR_SIZE
      );
    case 'right':
      return createRect(
        surface.right + surfaceGap,
        alignedTop,
        AVATAR_SIZE,
        AVATAR_SIZE
      );
    case 'top':
      return createRect(
        alignedLeft,
        surface.top - surfaceGap - AVATAR_SIZE,
        AVATAR_SIZE,
        AVATAR_SIZE
      );
    case 'bottom':
      return createRect(
        alignedLeft,
        surface.bottom + surfaceGap,
        AVATAR_SIZE,
        AVATAR_SIZE
      );
  }
};

const normalizeRotationDegrees = (value: number): number => {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

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

const getClosestPointOnRect = (rect: DOMRect, point: TutorPoint): TutorPoint => ({
  x: clamp(point.x, rect.left, rect.right),
  y: clamp(point.y, rect.top, rect.bottom),
});

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

const getRectSeparationDistance = (left: DOMRect, right: DOMRect): number => {
  const horizontalGap = Math.max(0, left.left - right.right, right.left - left.right);
  const verticalGap = Math.max(0, left.top - right.bottom, right.top - left.bottom);
  return Math.hypot(horizontalGap, verticalGap);
};

const getRectCenterDistance = (left: DOMRect, right: DOMRect): number => {
  const leftCenterX = left.left + left.width / 2;
  const leftCenterY = left.top + left.height / 2;
  const rightCenterX = right.left + right.width / 2;
  const rightCenterY = right.top + right.height / 2;

  return Math.hypot(leftCenterX - rightCenterX, leftCenterY - rightCenterY);
};

const getViewportOverflowArea = (
  rect: DOMRect,
  viewport: { width: number; height: number }
): number => {
  const viewportRect = createRect(EDGE_GAP, EDGE_GAP, viewport.width - EDGE_GAP * 2, viewport.height - EDGE_GAP * 2);
  const overlapArea = getRectOverlapArea(rect, viewportRect);
  return rect.width * rect.height - overlapArea;
};

const clampGuidedCalloutPosition = (input: {
  avatarPlacement: ReturnType<typeof getGuidedAvatarAttachmentPlacement>;
  candidateLeft: number;
  candidateTop: number;
  height: number;
  viewport: { width: number; height: number };
  width: number;
}): {
  left: number;
  top: number;
} => {
  const { avatarPlacement, candidateLeft, candidateTop, height, viewport, width } = input;
  const baseMinLeft = EDGE_GAP;
  const baseMaxLeft = viewport.width - EDGE_GAP - width;
  const baseMinTop = EDGE_GAP;
  const baseMaxTop = viewport.height - EDGE_GAP - height;

  let minLeft = baseMinLeft;
  let maxLeft = baseMaxLeft;
  let minTop = baseMinTop;
  let maxTop = baseMaxTop;

  switch (avatarPlacement) {
    case 'left':
      minLeft = Math.max(minLeft, EDGE_GAP + GUIDED_AVATAR_SURFACE_GAP + AVATAR_SIZE);
      break;
    case 'right':
      maxLeft = Math.min(
        maxLeft,
        viewport.width - EDGE_GAP - width - GUIDED_AVATAR_SURFACE_GAP - AVATAR_SIZE
      );
      break;
    case 'top':
      minTop = Math.max(minTop, EDGE_GAP + GUIDED_AVATAR_SURFACE_GAP + AVATAR_SIZE);
      break;
    case 'bottom':
      maxTop = Math.min(
        maxTop,
        viewport.height - EDGE_GAP - height - GUIDED_AVATAR_SURFACE_GAP - AVATAR_SIZE
      );
      break;
  }

  return {
    left:
      minLeft <= maxLeft
        ? clamp(candidateLeft, minLeft, maxLeft)
        : clamp(candidateLeft, baseMinLeft, baseMaxLeft),
    top:
      minTop <= maxTop
        ? clamp(candidateTop, minTop, maxTop)
        : clamp(candidateTop, baseMinTop, baseMaxTop),
  };
};

const getGuidedAvatarPlacementOrder = (
  calloutPlacement: 'top' | 'bottom' | 'left' | 'right'
): Array<ReturnType<typeof getGuidedAvatarAttachmentPlacement>> => {
  const primaryPlacement = getGuidedAvatarAttachmentPlacement(calloutPlacement);

  switch (calloutPlacement) {
    case 'top':
    case 'bottom':
      return [primaryPlacement, 'left', 'right', calloutPlacement];
    case 'left':
    case 'right':
      return [primaryPlacement, 'top', 'bottom', calloutPlacement];
  }
};

const getGuidedSelectionPreviewRect = (calloutRect: DOMRect): DOMRect =>
  createRect(
    calloutRect.left + GUIDED_SELECTION_PREVIEW_EDGE_INSET_X,
    calloutRect.top + GUIDED_SELECTION_PREVIEW_TOP_OFFSET,
    Math.max(120, calloutRect.width - GUIDED_SELECTION_PREVIEW_EDGE_INSET_X * 2),
    GUIDED_SELECTION_PREVIEW_HEIGHT
  );

export const resolveContinuousRotationDegrees = (previous: number | null, next: number): number => {
  if (previous === null || !Number.isFinite(previous)) {
    return next;
  }

  const normalizedPrevious = normalizeRotationDegrees(previous);
  const baseDelta = next - normalizedPrevious;
  const candidateDeltas = [baseDelta, baseDelta + 360, baseDelta - 360];
  const bestDelta = candidateDeltas.reduce((currentBest, candidate) =>
    Math.abs(candidate) < Math.abs(currentBest) ? candidate : currentBest
  );

  return previous + bestDelta;
};

export const formatGuidedArrowheadTransition = (
  motionProfile: TutorMotionProfile,
  prefersReducedMotion: boolean
): string | undefined => {
  if (prefersReducedMotion) {
    return undefined;
  }

  const duration = Math.max(
    GUIDED_ARROWHEAD_MIN_TRANSITION_DURATION_S,
    motionProfile.guidedAvatarTransition.duration * 0.55
  );
  const [x1, y1, x2, y2] = motionProfile.guidedAvatarTransition.ease;
  const easing = `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;

  return `left ${duration}s ${easing}, top ${duration}s ${easing}, transform ${duration}s ${easing}`;
};

export const getAvatarRectFromPoint = (point: TutorPoint): DOMRect =>
  createRect(point.x, point.y, AVATAR_SIZE, AVATAR_SIZE);

export const getMotionPositionPoint = (
  position: TutorMotionPosition | null | undefined
): TutorPoint | null => {
  if (!position || typeof position.left !== 'number' || typeof position.top !== 'number') {
    return null;
  }

  return {
    x: position.left,
    y: position.top,
  };
};

export const getFloatingTutorArrowheadGeometry = (input: {
  avatarPoint: TutorPoint | null;
  focusRect: DOMRect | null;
}): FloatingTutorArrowheadGeometry | null => {
  if (!input.avatarPoint || !input.focusRect) {
    return null;
  }

  const avatarRect = getAvatarRectFromPoint(input.avatarPoint);
  const avatarCenterX = avatarRect.left + avatarRect.width / 2;
  const avatarCenterY = avatarRect.top + avatarRect.height / 2;
  const nearestFocusPoint = getClosestPointOnRect(input.focusRect, {
    x: avatarCenterX,
    y: avatarCenterY,
  });
  let deltaX = nearestFocusPoint.x - avatarCenterX;
  let deltaY = nearestFocusPoint.y - avatarCenterY;
  let magnitude = Math.hypot(deltaX, deltaY);

  if (magnitude < 0.01) {
    const focusCenterX = input.focusRect.left + input.focusRect.width / 2;
    const focusCenterY = input.focusRect.top + input.focusRect.height / 2;
    deltaX = focusCenterX - avatarCenterX;
    deltaY = focusCenterY - avatarCenterY;
    magnitude = Math.hypot(deltaX, deltaY);
  }

  if (magnitude < 0.01) {
    deltaX = 0;
    deltaY = -1;
    magnitude = 1;
  }

  const unitX = deltaX / magnitude;
  const unitY = deltaY / magnitude;
  const radius = avatarRect.width / 2 - FLOATING_TUTOR_ARROWHEAD_RIM_INSET_PX;
  const localCenterX = avatarRect.width / 2;
  const localCenterY = avatarRect.height / 2;
  const anchorAvatarLeft = localCenterX + unitX * radius;
  const anchorAvatarTop = localCenterY + unitY * radius;
  const angle = normalizeRotationDegrees(
    (Math.atan2(deltaY, deltaX) * 180) / Math.PI + FLOATING_TUTOR_ARROWHEAD_ROTATION_OFFSET_DEG
  );
  const side: TutorHorizontalSide = unitX >= 0 ? 'right' : 'left';
  const absUnitX = Math.abs(unitX);
  const absUnitY = Math.abs(unitY);
  const quadrant =
    absUnitX >= absUnitY ? (unitX >= 0 ? 'right' : 'left') : unitY >= 0 ? 'bottom' : 'top';

  return {
    anchorAvatarLeft,
    anchorAvatarTop,
    anchorOffsetX: FLOATING_TUTOR_ARROWHEAD_ANCHOR_X,
    anchorOffsetY: FLOATING_TUTOR_ARROWHEAD_ANCHOR_Y,
    left: anchorAvatarLeft - FLOATING_TUTOR_ARROWHEAD_ANCHOR_X,
    targetX: nearestFocusPoint.x,
    targetY: nearestFocusPoint.y,
    top: anchorAvatarTop - FLOATING_TUTOR_ARROWHEAD_ANCHOR_Y,
    angle,
    side,
    quadrant,
  };
};

export const getFloatingTutorArrowCorridorRect = (input: {
  avatarPoint: TutorPoint | null;
  arrowhead: FloatingTutorArrowheadGeometry | null;
}): DOMRect | null => {
  if (!input.avatarPoint || !input.arrowhead) {
    return null;
  }

  const anchorX = input.avatarPoint.x + input.arrowhead.anchorAvatarLeft;
  const anchorY = input.avatarPoint.y + input.arrowhead.anchorAvatarTop;
  const left =
    Math.min(anchorX, input.arrowhead.targetX) - FLOATING_TUTOR_ARROWHEAD_CORRIDOR_PADDING_PX;
  const top =
    Math.min(anchorY, input.arrowhead.targetY) - FLOATING_TUTOR_ARROWHEAD_CORRIDOR_PADDING_PX;
  const width =
    Math.max(Math.abs(input.arrowhead.targetX - anchorX), 1) +
    FLOATING_TUTOR_ARROWHEAD_CORRIDOR_PADDING_PX * 2;
  const height =
    Math.max(Math.abs(input.arrowhead.targetY - anchorY), 1) +
    FLOATING_TUTOR_ARROWHEAD_CORRIDOR_PADDING_PX * 2;

  return createRect(left, top, width, height);
};

export const getGuidedCalloutLayout = (
  rect: DOMRect,
  viewport: { width: number; height: number },
  protectedRects: DOMRect[] = [],
  options?: {
    anchorRect?: DOMRect | null;
  }
): {
  entryDirection: TutorHorizontalSide;
  style: CSSProperties;
  placement: 'top' | 'bottom' | 'left' | 'right';
} => {
  const width = Math.min(280, Math.max(220, viewport.width * 0.24));
  const height = GUIDED_CALLOUT_HEIGHT;
  const gap = GUIDED_CALLOUT_FOCUS_GAP;
  const maxLeft = viewport.width - EDGE_GAP - width;
  const maxTop = viewport.height - EDGE_GAP - height;
  const centeredLeft = rect.left + rect.width / 2 - width / 2;
  const centeredTop = rect.top + rect.height / 2 - height / 2;
  const entryDirection = getTutorEntryDirection(rect, viewport.width);
  const candidates: Array<{
    placement: 'top' | 'bottom' | 'left' | 'right';
    left: number;
    top: number;
    priority: number;
  }> = [
    {
      placement: 'top',
      left: centeredLeft,
      top: rect.top - height - gap,
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
      left: rect.left - width - gap,
      top: centeredTop,
      priority: 3,
    },
  ];

  const bestCandidate = candidates
    .map((candidate) => {
      const left = clamp(candidate.left, EDGE_GAP, maxLeft);
      const top = clamp(candidate.top, EDGE_GAP, maxTop);
      const panelRect = createRect(left, top, width, height);
      const overlapArea = getRectOverlapArea(panelRect, rect);
      const protectedOverlapArea = protectedRects.reduce(
        (sum, protectedRect) => sum + getRectOverlapArea(panelRect, protectedRect),
        0
      );
      const anchorDistance = options?.anchorRect
        ? getRectSeparationDistance(panelRect, options.anchorRect)
        : 0;
      const repositionCost = Math.hypot(candidate.left - left, candidate.top - top);
      const score =
        overlapArea * 20 +
        protectedOverlapArea * 10 +
        anchorDistance * 0.45 +
        repositionCost * 0.6 +
        candidate.priority * 24;

      return {
        anchorDistance,
        placement: candidate.placement,
        left,
        top,
        overlapArea,
        protectedOverlapArea,
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

      const leftHasProtectedOverlap = leftCandidate.protectedOverlapArea > 0 ? 1 : 0;
      const rightHasProtectedOverlap = rightCandidate.protectedOverlapArea > 0 ? 1 : 0;
      if (leftHasProtectedOverlap !== rightHasProtectedOverlap) {
        return leftHasProtectedOverlap - rightHasProtectedOverlap;
      }

      if (leftCandidate.protectedOverlapArea !== rightCandidate.protectedOverlapArea) {
        return leftCandidate.protectedOverlapArea - rightCandidate.protectedOverlapArea;
      }

      if (leftCandidate.anchorDistance !== rightCandidate.anchorDistance) {
        return leftCandidate.anchorDistance - rightCandidate.anchorDistance;
      }

      return leftCandidate.score - rightCandidate.score;
    })[0] ?? {
    placement: 'bottom' as const,
    anchorDistance: 0,
    left: clamp(centeredLeft, EDGE_GAP, maxLeft),
    top: clamp(rect.bottom + gap, EDGE_GAP, maxTop),
    overlapArea: 0,
    protectedOverlapArea: 0,
    score: 0,
  };

  return {
    entryDirection,
    placement: bestCandidate.placement,
    style: {
      position: 'fixed',
      left: bestCandidate.left,
      top: bestCandidate.top,
      width,
    },
  };
};

export const getGuidedCalloutClusterLayout = (
  rect: DOMRect,
  viewport: { width: number; height: number },
  protectedRects: DOMRect[] = [],
  options?: {
    anchorRect?: DOMRect | null;
    calloutHeight?: number;
    hasSelectionPreview?: boolean;
  }
): {
  avatarPlacement: ReturnType<typeof getGuidedAvatarAttachmentPlacement>;
  avatarRect: DOMRect;
  avatarStyle: TutorMotionPosition;
  calloutRect: DOMRect;
  entryDirection: TutorHorizontalSide;
  placement: 'top' | 'bottom' | 'left' | 'right';
  style: CSSProperties;
} => {
  const width = Math.min(280, Math.max(220, viewport.width * 0.24));
  const height = options?.calloutHeight ?? GUIDED_CALLOUT_HEIGHT;
  const gap = GUIDED_CALLOUT_FOCUS_GAP;
  const centeredLeft = rect.left + rect.width / 2 - width / 2;
  const centeredTop = rect.top + rect.height / 2 - height / 2;
  const entryDirection = getTutorEntryDirection(rect, viewport.width);
  const candidates: Array<{
    left: number;
    placement: 'top' | 'bottom' | 'left' | 'right';
    priority: number;
    top: number;
  }> = [
    {
      placement: 'top',
      left: centeredLeft,
      top: rect.top - height - gap,
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
      left: rect.left - width - gap,
      top: centeredTop,
      priority: 3,
    },
  ];

  const bestCandidate = candidates
    .flatMap((candidate) =>
      getGuidedAvatarPlacementOrder(candidate.placement).map((avatarPlacement, avatarPriority) => {
        const avatarSurfaceGap = options?.hasSelectionPreview
          ? GUIDED_SELECTION_AVATAR_SURFACE_GAP
          : GUIDED_AVATAR_SURFACE_GAP;
        const clampedPosition = clampGuidedCalloutPosition({
          avatarPlacement,
          candidateLeft: candidate.left,
          candidateTop: candidate.top,
          height,
          viewport,
          width,
        });
        const panelRect = createRect(clampedPosition.left, clampedPosition.top, width, height);
        const avatarRect = getGuidedAvatarRectForCallout({
          focusRect: rect,
          placement: avatarPlacement,
          surface: panelRect,
          surfaceGap: avatarSurfaceGap,
        });
        const overlapArea = getRectOverlapArea(panelRect, rect);
        const protectedOverlapArea = protectedRects.reduce(
          (sum, protectedRect) => sum + getRectOverlapArea(panelRect, protectedRect),
          0
        );
        const avatarPrimaryOverlapArea = getRectOverlapArea(avatarRect, rect);
        const avatarProtectedOverlapArea = protectedRects.reduce(
          (sum, protectedRect) => sum + getRectOverlapArea(avatarRect, protectedRect),
          0
        );
        const clusterOverlapArea = getRectOverlapArea(panelRect, avatarRect);
        const selectionPreviewRect = options?.hasSelectionPreview
          ? getGuidedSelectionPreviewRect(panelRect)
          : null;
        const selectionPreviewAvatarDistance = selectionPreviewRect
          ? getRectSeparationDistance(avatarRect, selectionPreviewRect)
          : Number.POSITIVE_INFINITY;
        const selectionPreviewCrowding =
          selectionPreviewRect === null
            ? 0
            : Math.max(0, GUIDED_SELECTION_PREVIEW_SAFE_DISTANCE - selectionPreviewAvatarDistance);
        const anchorDistance = options?.anchorRect
          ? getRectSeparationDistance(panelRect, options.anchorRect)
          : 0;
        const avatarAnchorDistance = options?.anchorRect
          ? getRectSeparationDistance(avatarRect, options.anchorRect)
          : 0;
        const calloutFocusDistance = getRectSeparationDistance(panelRect, rect);
        const avatarFocusDistance = getRectSeparationDistance(avatarRect, rect);
        const calloutFocusCenterDistance = getRectCenterDistance(panelRect, rect);
        const avatarFocusCenterDistance = getRectCenterDistance(avatarRect, rect);
        const viewportOverflowArea =
          getViewportOverflowArea(panelRect, viewport) +
          getViewportOverflowArea(avatarRect, viewport);
        const repositionCost = Math.hypot(
          candidate.left - clampedPosition.left,
          candidate.top - clampedPosition.top
        );
        const score =
          overlapArea * 20 +
          protectedOverlapArea * 10 +
          avatarPrimaryOverlapArea * 18 +
          avatarProtectedOverlapArea * 1.25 +
          clusterOverlapArea * 40 +
          selectionPreviewCrowding * 22 +
          viewportOverflowArea * 24 +
          calloutFocusDistance * 1.9 +
          avatarFocusDistance * 3.1 +
          calloutFocusCenterDistance * 0.22 +
          avatarFocusCenterDistance * 0.34 +
          anchorDistance * 0.45 +
          avatarAnchorDistance * 0.3 +
          repositionCost * 0.6 +
          candidate.priority * 24 +
          avatarPriority * 12;

        return {
          anchorDistance,
          avatarAnchorDistance,
          avatarPrimaryOverlapArea,
          avatarProtectedOverlapArea,
          avatarPlacement,
          avatarPriority,
          avatarRect,
          avatarFocusCenterDistance,
          avatarFocusDistance,
          calloutRect: panelRect,
          calloutFocusCenterDistance,
          calloutFocusDistance,
          clusterOverlapArea,
          left: clampedPosition.left,
          overlapArea,
          placement: candidate.placement,
          protectedOverlapArea,
          score,
          selectionPreviewAvatarDistance,
          selectionPreviewCrowding,
          top: clampedPosition.top,
          viewportOverflowArea,
        };
      })
    )
    .sort((leftCandidate, rightCandidate) => {
      const leftHasClusterOverlap = leftCandidate.clusterOverlapArea > 0 ? 1 : 0;
      const rightHasClusterOverlap = rightCandidate.clusterOverlapArea > 0 ? 1 : 0;
      if (leftHasClusterOverlap !== rightHasClusterOverlap) {
        return leftHasClusterOverlap - rightHasClusterOverlap;
      }

      if (leftCandidate.clusterOverlapArea !== rightCandidate.clusterOverlapArea) {
        return leftCandidate.clusterOverlapArea - rightCandidate.clusterOverlapArea;
      }

      const leftHasViewportOverflow = leftCandidate.viewportOverflowArea > 0 ? 1 : 0;
      const rightHasViewportOverflow = rightCandidate.viewportOverflowArea > 0 ? 1 : 0;
      if (leftHasViewportOverflow !== rightHasViewportOverflow) {
        return leftHasViewportOverflow - rightHasViewportOverflow;
      }

      if (leftCandidate.viewportOverflowArea !== rightCandidate.viewportOverflowArea) {
        return leftCandidate.viewportOverflowArea - rightCandidate.viewportOverflowArea;
      }

      const leftHasOverlap = leftCandidate.overlapArea > 0 ? 1 : 0;
      const rightHasOverlap = rightCandidate.overlapArea > 0 ? 1 : 0;
      if (leftHasOverlap !== rightHasOverlap) {
        return leftHasOverlap - rightHasOverlap;
      }

      if (leftCandidate.overlapArea !== rightCandidate.overlapArea) {
        return leftCandidate.overlapArea - rightCandidate.overlapArea;
      }

      const leftHasProtectedOverlap = leftCandidate.protectedOverlapArea > 0 ? 1 : 0;
      const rightHasProtectedOverlap = rightCandidate.protectedOverlapArea > 0 ? 1 : 0;
      if (leftHasProtectedOverlap !== rightHasProtectedOverlap) {
        return leftHasProtectedOverlap - rightHasProtectedOverlap;
      }

      if (leftCandidate.protectedOverlapArea !== rightCandidate.protectedOverlapArea) {
        return leftCandidate.protectedOverlapArea - rightCandidate.protectedOverlapArea;
      }

      const leftHasPrimaryAvatarOverlap = leftCandidate.avatarPrimaryOverlapArea > 0 ? 1 : 0;
      const rightHasPrimaryAvatarOverlap = rightCandidate.avatarPrimaryOverlapArea > 0 ? 1 : 0;
      if (leftHasPrimaryAvatarOverlap !== rightHasPrimaryAvatarOverlap) {
        return leftHasPrimaryAvatarOverlap - rightHasPrimaryAvatarOverlap;
      }

      if (leftCandidate.avatarPrimaryOverlapArea !== rightCandidate.avatarPrimaryOverlapArea) {
        return leftCandidate.avatarPrimaryOverlapArea - rightCandidate.avatarPrimaryOverlapArea;
      }

      if (leftCandidate.avatarFocusDistance !== rightCandidate.avatarFocusDistance) {
        return leftCandidate.avatarFocusDistance - rightCandidate.avatarFocusDistance;
      }

      if (leftCandidate.calloutFocusDistance !== rightCandidate.calloutFocusDistance) {
        return leftCandidate.calloutFocusDistance - rightCandidate.calloutFocusDistance;
      }

      if (leftCandidate.avatarFocusCenterDistance !== rightCandidate.avatarFocusCenterDistance) {
        return leftCandidate.avatarFocusCenterDistance - rightCandidate.avatarFocusCenterDistance;
      }

      if (leftCandidate.calloutFocusCenterDistance !== rightCandidate.calloutFocusCenterDistance) {
        return leftCandidate.calloutFocusCenterDistance - rightCandidate.calloutFocusCenterDistance;
      }

      if (leftCandidate.selectionPreviewCrowding !== rightCandidate.selectionPreviewCrowding) {
        return leftCandidate.selectionPreviewCrowding - rightCandidate.selectionPreviewCrowding;
      }

      if (
        leftCandidate.selectionPreviewAvatarDistance !==
        rightCandidate.selectionPreviewAvatarDistance
      ) {
        return (
          rightCandidate.selectionPreviewAvatarDistance -
          leftCandidate.selectionPreviewAvatarDistance
        );
      }

      const leftHasProtectedAvatarOverlap = leftCandidate.avatarProtectedOverlapArea > 0 ? 1 : 0;
      const rightHasProtectedAvatarOverlap = rightCandidate.avatarProtectedOverlapArea > 0 ? 1 : 0;
      if (leftHasProtectedAvatarOverlap !== rightHasProtectedAvatarOverlap) {
        return leftHasProtectedAvatarOverlap - rightHasProtectedAvatarOverlap;
      }

      if (leftCandidate.avatarProtectedOverlapArea !== rightCandidate.avatarProtectedOverlapArea) {
        return leftCandidate.avatarProtectedOverlapArea - rightCandidate.avatarProtectedOverlapArea;
      }

      if (leftCandidate.avatarPriority !== rightCandidate.avatarPriority) {
        return leftCandidate.avatarPriority - rightCandidate.avatarPriority;
      }

      if (leftCandidate.anchorDistance !== rightCandidate.anchorDistance) {
        return leftCandidate.anchorDistance - rightCandidate.anchorDistance;
      }

      if (leftCandidate.avatarAnchorDistance !== rightCandidate.avatarAnchorDistance) {
        return leftCandidate.avatarAnchorDistance - rightCandidate.avatarAnchorDistance;
      }

      return leftCandidate.score - rightCandidate.score;
    })[0] ?? (() => {
    const avatarPlacement = getGuidedAvatarAttachmentPlacement('bottom');
    const clampedPosition = clampGuidedCalloutPosition({
      avatarPlacement,
      candidateLeft: centeredLeft,
      candidateTop: rect.bottom + gap,
      height,
      viewport,
      width,
    });
    const calloutRect = createRect(clampedPosition.left, clampedPosition.top, width, height);
    const avatarRect = getGuidedAvatarRectForCallout({
      focusRect: rect,
      placement: avatarPlacement,
      surface: calloutRect,
    });
    return {
      anchorDistance: 0,
      avatarAnchorDistance: 0,
      avatarPrimaryOverlapArea: 0,
      avatarProtectedOverlapArea: 0,
      avatarPlacement,
      avatarPriority: 0,
      avatarRect,
      avatarFocusCenterDistance: getRectCenterDistance(
        avatarRect,
        rect
      ),
      avatarFocusDistance: getRectSeparationDistance(
        avatarRect,
        rect
      ),
      calloutRect,
      calloutFocusCenterDistance: getRectCenterDistance(calloutRect, rect),
      calloutFocusDistance: getRectSeparationDistance(calloutRect, rect),
      clusterOverlapArea: 0,
      left: clampedPosition.left,
      overlapArea: 0,
      placement: 'bottom' as const,
      protectedOverlapArea: 0,
      score: 0,
      selectionPreviewAvatarDistance: Number.POSITIVE_INFINITY,
      selectionPreviewCrowding: 0,
      top: clampedPosition.top,
      viewportOverflowArea: 0,
    };
  })();

  return {
    avatarPlacement: bestCandidate.avatarPlacement,
    avatarRect: bestCandidate.avatarRect,
    avatarStyle: {
      left: bestCandidate.avatarRect.left,
      top: bestCandidate.avatarRect.top,
    },
    calloutRect: bestCandidate.calloutRect,
    entryDirection,
    placement: bestCandidate.placement,
    style: {
      position: 'fixed',
      left: bestCandidate.left,
      top: bestCandidate.top,
      width,
    },
  };
};

export const getGuidedSelectionCalloutAttachmentHeight = (calloutWidth: number): number =>
  clamp(
    Math.round(387 - calloutWidth * 0.6),
    GUIDED_SELECTION_CALLOUT_ATTACHMENT_HEIGHT_MIN,
    GUIDED_SELECTION_CALLOUT_ATTACHMENT_HEIGHT_MAX
  );

export const getGuidedSelectionCalloutHeight = (
  viewport: { width: number; height: number },
  options?: {
    hasKnowledgeContext?: boolean;
    hasResolvedAnswer?: boolean;
  }
): number => {
  const maxHeight = Math.max(GUIDED_CALLOUT_HEIGHT, viewport.height - EDGE_GAP * 2);
  const estimatedHeight =
    GUIDED_CALLOUT_HEIGHT +
    (options?.hasKnowledgeContext ? GUIDED_SELECTION_KNOWLEDGE_CONTEXT_EXTRA_HEIGHT : 0) +
    (options?.hasResolvedAnswer ? GUIDED_SELECTION_RESOLVED_ANSWER_EXTRA_HEIGHT : 0);

  return clamp(estimatedHeight, GUIDED_CALLOUT_HEIGHT, Math.min(560, maxHeight));
};

export const getEstimatedBubbleHeight = (
  viewport: { width: number; height: number },
  extraHeight = 0
): number => {
  const maxHeight = Math.max(220, viewport.height - EDGE_GAP * 2);
  const baseHeight = clamp(
    Math.min(viewport.height * 0.58, BUBBLE_MAX_HEIGHT),
    Math.min(BUBBLE_MIN_HEIGHT, maxHeight),
    maxHeight
  );
  return clamp(baseHeight + extraHeight, Math.min(BUBBLE_MIN_HEIGHT, maxHeight), maxHeight);
};

export const getSelectionSpotlightStyle = (rect: DOMRect): CSSProperties => {
  const padding = 10;

  return {
    position: 'fixed',
    left: Math.max(EDGE_GAP, rect.left - padding),
    top: Math.max(EDGE_GAP, rect.top - padding),
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
};

export const getSelectionGlowStyle = (rect: DOMRect): CSSProperties => {
  const paddingX = 6;
  const paddingY = 4;

  return {
    position: 'fixed',
    left: Math.max(EDGE_GAP, rect.left - paddingX),
    top: Math.max(EDGE_GAP, rect.top - paddingY),
    width: rect.width + paddingX * 2,
    height: rect.height + paddingY * 2,
    background:
      'linear-gradient(180deg, var(--kangur-ai-tutor-selection-glow-fill-start), var(--kangur-ai-tutor-selection-glow-fill-end))',
    border: '1px solid var(--kangur-ai-tutor-selection-glow-border)',
    boxShadow:
      '0 0 12px 2px var(--kangur-ai-tutor-selection-glow-shadow-inner), 0 0 22px 6px var(--kangur-ai-tutor-selection-glow-shadow-outer), 0 0 32px 10px var(--kangur-ai-tutor-selection-glow-shadow-far), inset 0 0 0 1px var(--kangur-ai-tutor-selection-glow-border)',
  };
};
