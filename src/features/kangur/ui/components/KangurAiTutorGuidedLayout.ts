
import {
  AVATAR_SIZE,
  BUBBLE_MAX_HEIGHT,
  BUBBLE_MIN_HEIGHT,
  EDGE_GAP,
  type TutorMotionPosition,
  type TutorMotionProfile,
  type TutorPointerSide,
} from './KangurAiTutorWidget.shared';

import type { TutorPoint } from './KangurAiTutorWidget.types';
import type { CSSProperties } from 'react';

const FLOATING_TUTOR_ARROWHEAD_ANCHOR_X = 12.5;
const FLOATING_TUTOR_ARROWHEAD_ANCHOR_Y = 9;
const FLOATING_TUTOR_ARROWHEAD_DOT_RADIUS_PX = 3.2;
const FLOATING_TUTOR_ARROWHEAD_ROTATION_OFFSET_DEG = 180;
const FLOATING_TUTOR_ARROWHEAD_RIM_INSET_PX = FLOATING_TUTOR_ARROWHEAD_DOT_RADIUS_PX + 1;
const FLOATING_TUTOR_ARROWHEAD_CORRIDOR_PADDING_PX = 18;
const GUIDED_ARROWHEAD_MIN_TRANSITION_DURATION_S = 0.22;
export const GUIDED_CALLOUT_HEIGHT = 260;
const GUIDED_SELECTION_CALLOUT_ATTACHMENT_HEIGHT_MAX = 255;
const GUIDED_SELECTION_CALLOUT_ATTACHMENT_HEIGHT_MIN = 219;

type FloatingTutorArrowheadGeometry = {
  angle: number;
  anchorAvatarLeft: number;
  anchorAvatarTop: number;
  anchorOffsetX: number;
  anchorOffsetY: number;
  left: number;
  side: TutorPointerSide;
  targetX: number;
  targetY: number;
  top: number;
  quadrant: 'top' | 'right' | 'bottom' | 'left';
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

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
  const side: TutorPointerSide = unitX >= 0 ? 'right' : 'left';
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
): { style: CSSProperties; placement: 'top' | 'bottom' | 'left' | 'right' } => {
  const width = Math.min(280, Math.max(220, viewport.width * 0.24));
  const height = GUIDED_CALLOUT_HEIGHT;
  const gap = 18;
  const maxLeft = viewport.width - EDGE_GAP - width;
  const maxTop = viewport.height - EDGE_GAP - height;
  const centeredLeft = rect.left + rect.width / 2 - width / 2;
  const centeredTop = rect.top + rect.height / 2 - height / 2;
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
