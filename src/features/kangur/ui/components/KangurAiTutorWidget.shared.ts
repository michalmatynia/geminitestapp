import type { KangurTutorAnchorKind } from '@/features/kangur/ui/context/kangur-tutor-types';
import type {
  KangurAiTutorFollowUpAction,
  KangurAiTutorKnowledgeReference,
  KangurAiTutorMotionPresetKind,
  KangurAiTutorPromptMode,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type { Point2d, Size2d } from '@/shared/contracts/geometry';
import type { TutorSurface } from './KangurAiTutorWidget.types';

export const EDGE_GAP = 16;
export const AVATAR_SIZE = 56;
export const CTA_WIDTH = 124;
export const CTA_HEIGHT = 40;
export const DESKTOP_BUBBLE_WIDTH = 384;
export const MOBILE_BUBBLE_WIDTH = 320;
export const ATTACHED_AVATAR_EDGE_INSET = 18;
export const ATTACHED_AVATAR_OVERLAP = 12;
export const GUIDED_AVATAR_SURFACE_GAP = 16;
export const ATTACHED_AVATAR_POINTER_EDGE_INSET = 6;
export const ATTACHED_AVATAR_POINTER_PADDING = 12;
export const PROTECTED_CONTENT_GAP = 20;
export const BUBBLE_MIN_HEIGHT = 280;
export const BUBBLE_MAX_HEIGHT = 460;
export const KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY = 'kangur-ai-tutor-widget-v1';
export const KANGUR_AI_TUTOR_GUEST_INTRO_STORAGE_KEY = 'kangur-ai-tutor-guest-intro-v1';
export const KANGUR_AI_TUTOR_HOME_ONBOARDING_STORAGE_KEY = 'kangur-ai-tutor-home-onboarding-v1';

export const getFloatingTutorAvatarEdgeGap = (viewportWidth: number): number => {
  if (viewportWidth <= 360) {
    return 4;
  }

  if (viewportWidth < 768) {
    return 8;
  }

  return EDGE_GAP;
};

export const getFloatingTutorAvatarSize = (viewportWidth: number): number => {
  if (viewportWidth <= 360) {
    return 44;
  }

  if (viewportWidth < 768) {
    return 48;
  }

  return AVATAR_SIZE;
};

export const getFloatingTutorAvatarBounds = (viewport: Size2d) => {
  const edgeGap = getFloatingTutorAvatarEdgeGap(viewport.width);
  const size = getFloatingTutorAvatarSize(viewport.width);

  return {
    minLeft: edgeGap,
    minTop: edgeGap,
    maxLeft: Math.max(edgeGap, viewport.width - edgeGap - size),
    maxTop: Math.max(edgeGap, viewport.height - edgeGap - size),
    size,
  };
};

export type TutorMotionPosition = {
  left?: number | string;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
};

export type TutorPanelSnapState =
  | 'free'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export type TutorPanelPositionMode = 'contextual' | 'manual';

export type TutorHorizontalSide = 'left' | 'right';
export type TutorEdgePlacement = 'top' | 'bottom' | 'left' | 'right';
export type TutorPanelChromeVariant = 'default' | 'contextual_result';

export type TutorBubblePlacementStrategy =
  | 'dock'
  | 'right'
  | 'left'
  | 'above'
  | 'below'
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left';

export type TutorAvatarPointer = {
  end: Point2d;
  height: number;
  left: number;
  side: TutorHorizontalSide;
  start: Point2d;
  top: number;
  width: number;
};

export type TutorGuidedArrowhead = {
  angle: number;
  anchorAvatarLeft: number;
  anchorAvatarTop: number;
  anchorOffsetX: number;
  anchorOffsetY: number;
  left: number;
  quadrant: TutorEdgePlacement;
  side: TutorHorizontalSide;
  targetX: number;
  targetY: number;
  top: number;
};

export type TutorConversationFocus = {
  assignmentId: string | null;
  contentId: string | null;
  id: string | null;
  kind: KangurTutorAnchorKind | 'selection' | null;
  knowledgeReference: KangurAiTutorKnowledgeReference | null;
  label: string | null;
  surface: TutorSurface | null;
};

export type ActiveTutorFocus = {
  conversationFocus: TutorConversationFocus;
  rect: DOMRect | null;
  kind: KangurTutorAnchorKind | 'selection' | null;
  id: string | null;
  label: string | null;
  assignmentId: string | null;
};

export type TutorQuickAction = {
  id: string;
  label: string;
  prompt: string;
  promptMode: KangurAiTutorPromptMode;
  interactionIntent?: 'hint' | 'explain' | 'review' | 'next_step';
};

export type TutorMotionProfile = {
  kind: KangurAiTutorMotionPresetKind;
  sheetBreakpoint: number;
  avatarTransition: {
    type: 'spring';
    stiffness: number;
    damping: number;
  };
  guidedAvatarTransition: {
    type: 'tween';
    duration: number;
    ease: [number, number, number, number];
  };
  bubbleTransition: {
    type: 'spring';
    stiffness: number;
    damping: number;
  };
  hoverScale: number;
  tapScale: number;
  motionCompletedDelayMs: number;
  desktopBubbleWidth: number;
  mobileBubbleWidth: number;
};

export type TutorMoodAvatarProps = {
  svgContent?: string | null;
  avatarImageUrl?: string | null;
  label: string;
  className?: string;
  imgClassName?: string;
  svgClassName?: string;
  fallbackIconClassName?: string;
  'data-testid'?: string;
};

export type TutorRecommendation = {
  prompt: string;
  promptMode: KangurAiTutorPromptMode;
  buttonLabel: string;
  promptLabel: string;
  interactionIntent: TutorQuickAction['interactionIntent'];
  href?: string;
  followUpAction?: KangurAiTutorFollowUpAction | null;
};

export const getTutorEntryDirection = (
  rect: Pick<DOMRect, 'left' | 'width'> | null,
  viewportWidth: number
): TutorHorizontalSide => {
  if (!rect) {
    return 'right';
  }

  const centerX = rect.left + rect.width / 2;
  return centerX <= viewportWidth / 2 ? 'left' : 'right';
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const getTutorPanelBounds = (viewport: Size2d, panelSize: Size2d) => ({
  maxLeft: Math.max(EDGE_GAP, viewport.width - EDGE_GAP - panelSize.width),
  maxTop: Math.max(EDGE_GAP, viewport.height - EDGE_GAP - panelSize.height),
  minLeft: EDGE_GAP,
  minTop: EDGE_GAP,
});

export const clampTutorPanelPoint = (
  point: Point2d,
  viewport: Size2d,
  panelSize: Size2d
): Point2d => {
  const { maxLeft, maxTop, minLeft, minTop } = getTutorPanelBounds(viewport, panelSize);

  return {
    x: clamp(point.x, minLeft, maxLeft),
    y: clamp(point.y, minTop, maxTop),
  };
};

export const applyTutorPanelSnapState = (
  point: Point2d,
  snap: TutorPanelSnapState,
  viewport: Size2d,
  panelSize: Size2d
): Point2d => {
  const clampedPoint = clampTutorPanelPoint(point, viewport, panelSize);
  const { maxLeft, maxTop, minLeft, minTop } = getTutorPanelBounds(viewport, panelSize);

  return {
    x:
      snap.includes('left')
        ? minLeft
        : snap.includes('right')
          ? maxLeft
          : clampedPoint.x,
    y:
      snap.includes('top')
        ? minTop
        : snap.includes('bottom')
          ? maxTop
          : clampedPoint.y,
  };
};

const TUTOR_PANEL_SNAP_THRESHOLD = 36;

export const getTutorPanelSnapState = (
  point: Point2d,
  viewport: Size2d,
  panelSize: Size2d
): TutorPanelSnapState => {
  const { maxLeft, maxTop, minLeft, minTop } = getTutorPanelBounds(viewport, panelSize);
  const nearLeft = Math.abs(point.x - minLeft) <= TUTOR_PANEL_SNAP_THRESHOLD;
  const nearRight = Math.abs(point.x - maxLeft) <= TUTOR_PANEL_SNAP_THRESHOLD;
  const nearTop = Math.abs(point.y - minTop) <= TUTOR_PANEL_SNAP_THRESHOLD;
  const nearBottom = Math.abs(point.y - maxTop) <= TUTOR_PANEL_SNAP_THRESHOLD;

  if (nearLeft && nearTop) {
    return 'top-left';
  }

  if (nearRight && nearTop) {
    return 'top-right';
  }

  if (nearLeft && nearBottom) {
    return 'bottom-left';
  }

  if (nearRight && nearBottom) {
    return 'bottom-right';
  }

  if (nearLeft) {
    return 'left';
  }

  if (nearRight) {
    return 'right';
  }

  if (nearTop) {
    return 'top';
  }

  if (nearBottom) {
    return 'bottom';
  }

  return 'free';
};

export const snapTutorPanelPoint = (
  point: Point2d,
  viewport: Size2d,
  panelSize: Size2d
): { point: Point2d; snap: TutorPanelSnapState } => {
  const clampedPoint = clampTutorPanelPoint(point, viewport, panelSize);
  const snap = getTutorPanelSnapState(clampedPoint, viewport, panelSize);

  return {
    point: applyTutorPanelSnapState(clampedPoint, snap, viewport, panelSize),
    snap,
  };
};
