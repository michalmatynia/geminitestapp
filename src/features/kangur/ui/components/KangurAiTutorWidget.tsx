'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, Send, BrainCircuit } from 'lucide-react';
import NextImage from 'next/image';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';

import { KANGUR_BASE_PATH } from '@/features/kangur/config/routing';
import {
  useOptionalContextRegistryPageEnvelope,
  useRegisterContextRegistryPageSource,
} from '@/features/ai/ai-context-registry/context/page-context';
import { buildContextRegistryConsumerEnvelope } from '@/features/ai/ai-context-registry/context/page-context-shared';
import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import {
  KANGUR_NARRATOR_SETTINGS_KEY,
  parseKangurNarratorSettings,
} from '@/features/kangur/settings';
import { resolveKangurAiTutorMotionPresetKind } from '@/features/kangur/settings-ai-tutor';
import { buildKangurLessonNarrationScriptFromText } from '@/features/kangur/tts/script';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import type { KangurTutorAnchorKind } from '@/features/kangur/ui/context/kangur-tutor-types';
import { useKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import {
  buildKangurRecommendationHref,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  selectBestTutorAnchor,
  useOptionalKangurTutorAnchors,
} from '@/features/kangur/ui/context/KangurTutorAnchorContext';
import {
  KangurButton,
  KangurGlassPanel,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import { useKangurTextHighlight } from '@/features/kangur/ui/hooks/useKangurTextHighlight';
import type {
  KangurAiTutorConversationContext,
  KangurAiTutorFollowUpAction,
  KangurAiTutorFocusKind,
  KangurAiTutorLearnerMemory,
  KangurAiTutorMotionPresetKind,
  KangurAiTutorPromptMode,
  KangurAiTutorSurface,
} from '@/shared/contracts/kangur-ai-tutor';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { cn, getMotionSafeScrollBehavior, sanitizeSvg } from '@/shared/utils';

import { extractNarrationTextFromElement } from './kangur-narrator-utils';
import {
  ATTACHED_AVATAR_EDGE_INSET,
  ATTACHED_AVATAR_OVERLAP,
  ATTACHED_AVATAR_POINTER_EDGE_INSET,
  ATTACHED_AVATAR_POINTER_PADDING,
  AVATAR_SIZE,
  BUBBLE_MAX_HEIGHT,
  BUBBLE_MIN_HEIGHT,
  CTA_HEIGHT,
  CTA_WIDTH,
  DESKTOP_BUBBLE_WIDTH,
  EDGE_GAP,
  MOBILE_BUBBLE_WIDTH,
  PROTECTED_CONTENT_GAP,
  type ActiveTutorFocus,
  type TutorAvatarAttachmentSide,
  type TutorBubblePlacementStrategy,
  type TutorMoodAvatarProps,
  type TutorMotionPosition,
  type TutorMotionProfile,
  type TutorPointerSide,
  type TutorQuickAction,
} from './KangurAiTutorWidget.shared';
import {
  clearPersistedPendingTutorFollowUp,
  clearPersistedTutorAvatarPosition,
  clearPersistedTutorSessionKey,
  getGuestIntroPanelStyle,
  loadPersistedGuestIntroRecord,
  loadPersistedHomeOnboardingRecord,
  loadPersistedPendingTutorFollowUp,
  loadPersistedTutorAvatarPosition,
  loadPersistedTutorVisibilityHidden,
  loadPersistedTutorSessionKey,
  persistGuestIntroRecord,
  persistHomeOnboardingRecord,
  persistPendingTutorFollowUp,
  persistTutorAvatarPosition,
  persistTutorVisibilityHidden,
  persistTutorSessionKey,
  subscribeToTutorVisibilityChanges,
  type KangurAiTutorGuestIntroCheckResponse,
  type KangurAiTutorGuestIntroRecord,
  type KangurAiTutorHomeOnboardingRecord,
} from './KangurAiTutorWidget.storage';
import { KangurNarratorControl } from './KangurNarratorControl';

const KANGUR_AI_TUTOR_NARRATOR_CONTEXT_ROOT_IDS = [
  'component:kangur-ai-tutor-narrator',
  'action:kangur-ai-tutor-tts',
] as const;

type TutorSurface = KangurAiTutorSurface;
type TutorPoint = {
  x: number;
  y: number;
};

type TutorProactiveNudge = {
  mode: 'gentle' | 'coach';
  title: string;
  description: string;
  action: TutorQuickAction;
};

type TutorMessageFeedback = 'helpful' | 'not_helpful';

type TutorPointerGeometry = {
  left: number;
  top: number;
  width: number;
  height: number;
  side: TutorPointerSide;
  start: TutorPoint;
  end: TutorPoint;
};

type FloatingTutorArrowheadGeometry = {
  angle: number;
  left: number;
  side: TutorPointerSide;
  top: number;
  quadrant: 'top' | 'right' | 'bottom' | 'left';
};

type GuidedTutorAuthMode = 'sign-in' | 'create-account';
type GuidedTutorAuthKind =
  | 'login_action'
  | 'create_account_action'
  | 'login_identifier_field'
  | 'login_form';

type GuidedTutorTarget =
  | {
      mode: 'auth';
      authMode: GuidedTutorAuthMode;
      kind: GuidedTutorAuthKind;
    }
  | {
      mode: 'selection';
      kind: 'selection_excerpt';
      selectedText: string;
    };

type TutorHomeOnboardingStepKind =
  | 'home_actions'
  | 'home_quest'
  | 'priority_assignments'
  | 'leaderboard'
  | 'progress';

type TutorHomeOnboardingStep = {
  id: string;
  kind: TutorHomeOnboardingStepKind;
  title: string;
  description: string;
};

type TutorAvatarDragState = {
  moved: boolean;
  origin: TutorPoint;
  pointerId: number;
  startX: number;
  startY: number;
};

type TutorAskEntrySource = 'guest_intro' | 'guest_assistance' | 'guided_help';

const FOLLOW_UP_COMPLETION_MAX_AGE_MS = 30 * 60 * 1000;
const FLOATING_TUTOR_AVATAR_RIM_COLOR = '#78350f';
const FLOATING_TUTOR_ARROWHEAD_ROTATION_OFFSET_DEG = 180;
const FLOATING_TUTOR_ARROWHEAD_EXTRUSION_OFFSET_PX = 2.5;
const GUIDED_ARROWHEAD_MIN_TRANSITION_DURATION_S = 0.22;
const SELECTION_PROTECTED_ZONE_PADDING_X = 140;
const SELECTION_PROTECTED_ZONE_PADDING_Y = 96;
const HOME_ONBOARDING_ELIGIBLE_CONTENT_ID = 'game:home';
const HOME_ONBOARDING_STEP_DEFINITIONS: TutorHomeOnboardingStep[] = [
  {
    id: 'home-actions',
    kind: 'home_actions',
    title: 'Tutaj wybierasz, jak chcesz zaczac.',
    description:
      'Mozesz przejsc do lekcji, uruchomic gre, trening mieszany albo Kangura Matematycznego.',
  },
  {
    id: 'home-quest',
    kind: 'home_quest',
    title: 'Tutaj pojawia sie Twoja aktualna misja.',
    description:
      'To najszybszy sposob, zeby zobaczyc, co teraz warto zrobic dalej bez zgadywania.',
  },
  {
    id: 'priority-assignments',
    kind: 'priority_assignments',
    title: 'Tutaj znajdziesz zadania od rodzica.',
    description:
      'Jesli sa ustawione, warto zaczynac od nich, bo to priorytety do wykonania.',
  },
  {
    id: 'leaderboard',
    kind: 'leaderboard',
    title: 'Tutaj widzisz ranking.',
    description:
      'Mozesz sprawdzic, jak wyglada Twoj wynik na tle innych i ile jeszcze brakuje do kolejnego skoku.',
  },
  {
    id: 'progress',
    kind: 'progress',
    title: 'Tutaj sledzisz swoj postep.',
    description:
      'W tym miejscu zobaczysz rozwoj gracza, zdobyte punkty i tempo nauki.',
  },
];

const isAuthGuidedTutorTarget = (
  value: GuidedTutorTarget | null | undefined
): value is Extract<GuidedTutorTarget, { mode: 'auth' }> => value?.mode === 'auth';

const isSelectionGuidedTutorTarget = (
  value: GuidedTutorTarget | null | undefined
): value is Extract<GuidedTutorTarget, { mode: 'selection' }> => value?.mode === 'selection';

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const normalizeRotationDegrees = (value: number): number => {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const resolveContinuousRotationDegrees = (
  previous: number | null,
  next: number
): number => {
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

const formatGuidedArrowheadTransition = (
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

const getAssistantMessageFeedbackKey = (
  sessionKey: string | null,
  index: number,
  message: { content: string }
): string => `${sessionKey ?? 'session'}:${index}:${message.content.trim()}`;

const TutorMoodAvatar = ({
  svgContent,
  avatarImageUrl,
  label,
  className,
  imgClassName,
  svgClassName,
  fallbackIconClassName,
  'data-testid': dataTestId,
}: TutorMoodAvatarProps): React.JSX.Element => {
  const hasImage = typeof avatarImageUrl === 'string' && avatarImageUrl.trim().length > 0;
  const hasSvg = typeof svgContent === 'string' && svgContent.trim().length > 0;

  return (
    <div
      aria-label={label}
      className={cn('relative flex items-center justify-center overflow-hidden rounded-full', className)}
      data-testid={dataTestId}
      role='img'
    >
      {hasImage ? (
        <NextImage
          src={avatarImageUrl}
          alt={label}
          fill
          sizes='100%'
          unoptimized
          className={cn('h-full w-full object-cover', imgClassName)}
          loading='lazy'
        />
      ) : hasSvg ? (
        <div
          className={cn(
            'h-full w-full [&_svg]:h-full [&_svg]:w-full [&_svg]:overflow-visible',
            svgClassName
          )}
          dangerouslySetInnerHTML={{ __html: sanitizeSvg(svgContent, { viewBox: '0 0 100 100' }) }}
        />
      ) : (
        <BrainCircuit
          aria-hidden='true'
          className={cn('h-1/2 w-1/2 text-white', fallbackIconClassName)}
        />
      )}
    </div>
  );
};

const cloneRect = (rect: DOMRect | null | undefined): DOMRect | null => {
  if (!rect) {
    return null;
  }

  if (typeof DOMRect === 'function') {
    return new DOMRect(rect.x, rect.y, rect.width, rect.height);
  }

  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    toJSON: () => ({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
    }),
  } as DOMRect;
};

const getPageRect = (rect: DOMRect | null | undefined): DOMRect | null => {
  if (!rect) {
    return null;
  }

  return createRect(rect.left + window.scrollX, rect.top + window.scrollY, rect.width, rect.height);
};

const getViewportRectFromPageRect = (rect: DOMRect | null | undefined): DOMRect | null => {
  if (!rect) {
    return null;
  }

  return createRect(rect.left - window.scrollX, rect.top - window.scrollY, rect.width, rect.height);
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

const getExpandedRect = (
  rect: DOMRect | null | undefined,
  paddingX: number,
  paddingY: number
): DOMRect | null => {
  if (!rect) {
    return null;
  }

  return createRect(
    rect.left - paddingX,
    rect.top - paddingY,
    rect.width + paddingX * 2,
    rect.height + paddingY * 2
  );
};

const getSelectionProtectedRect = (
  selectionRect: DOMRect | null | undefined,
  selectionContainerRect: DOMRect | null | undefined
): DOMRect | null => {
  if (selectionContainerRect) {
    return selectionContainerRect;
  }

  return getExpandedRect(
    selectionRect,
    SELECTION_PROTECTED_ZONE_PADDING_X,
    SELECTION_PROTECTED_ZONE_PADDING_Y
  );
};

const getViewport = (): { width: number; height: number } => {
  if (typeof window === 'undefined') {
    return { width: 1280, height: 720 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

const getDockAvatarPoint = (viewport: {
  width: number;
  height: number;
}): TutorPoint => ({
  x: viewport.width - EDGE_GAP - AVATAR_SIZE,
  y: viewport.height - EDGE_GAP - AVATAR_SIZE,
});

const clampAvatarPoint = (point: TutorPoint, viewport: {
  width: number;
  height: number;
}): TutorPoint => ({
  x: clamp(point.x, EDGE_GAP, viewport.width - EDGE_GAP - AVATAR_SIZE),
  y: clamp(point.y, EDGE_GAP, viewport.height - EDGE_GAP - AVATAR_SIZE),
});

const getDockAvatarStyle = (): TutorMotionPosition => {
  const point = getDockAvatarPoint(getViewport());
  return {
    left: point.x,
    top: point.y,
  };
};

const getDockAvatarRect = (viewport: { width: number; height: number }): DOMRect =>
  createRect(getDockAvatarPoint(viewport).x, getDockAvatarPoint(viewport).y, AVATAR_SIZE, AVATAR_SIZE);

const getAvatarRectFromPoint = (point: TutorPoint): DOMRect =>
  createRect(point.x, point.y, AVATAR_SIZE, AVATAR_SIZE);

const getAnchorAvatarStyle = (rect: DOMRect): TutorMotionPosition => {
  const viewport = getViewport();
  const left = clamp(
    rect.left + rect.width / 2 - AVATAR_SIZE / 2,
    EDGE_GAP,
    viewport.width - EDGE_GAP - AVATAR_SIZE
  );
  const preferredTop = rect.top - AVATAR_SIZE - 12;
  const fallbackTop = rect.bottom + 12;
  const top = preferredTop >= EDGE_GAP
    ? preferredTop
    : clamp(fallbackTop, EDGE_GAP, viewport.height - EDGE_GAP - AVATAR_SIZE);

  return {
    left,
    top,
  };
};

const getEstimatedBubbleHeight = (
  viewport: { width: number; height: number },
  extraHeight = 0
): number => {
  const maxHeight = Math.max(220, viewport.height - EDGE_GAP * 2);
  const baseHeight = clamp(
    Math.min(viewport.height * 0.58, BUBBLE_MAX_HEIGHT),
    Math.min(BUBBLE_MIN_HEIGHT, maxHeight),
    maxHeight
  );
  return clamp(
    baseHeight + extraHeight,
    Math.min(BUBBLE_MIN_HEIGHT, maxHeight),
    maxHeight
  );
};

const getRectUnion = (rects: Array<DOMRect | null | undefined>): DOMRect | null => {
  const validRects = rects.filter(Boolean) as DOMRect[];
  if (validRects.length === 0) {
    return null;
  }

  const left = Math.min(...validRects.map((rect) => rect.left));
  const top = Math.min(...validRects.map((rect) => rect.top));
  const right = Math.max(...validRects.map((rect) => rect.right));
  const bottom = Math.max(...validRects.map((rect) => rect.bottom));
  return createRect(left, top, right - left, bottom - top);
};

const getRectOverlapArea = (left: DOMRect, right: DOMRect): number => {
  const overlapWidth = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left));
  const overlapHeight = Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
  return overlapWidth * overlapHeight;
};

const getPanelCenterDistance = (
  panelRect: DOMRect,
  dockRect: DOMRect
): number => {
  const panelCenterX = panelRect.left + panelRect.width / 2;
  const panelCenterY = panelRect.top + panelRect.height / 2;
  const dockCenterX = dockRect.left + dockRect.width / 2;
  const dockCenterY = dockRect.top + dockRect.height / 2;
  return Math.hypot(panelCenterX - dockCenterX, panelCenterY - dockCenterY);
};

const getDockLaunchOffset = (input: {
  finalLeft: number;
  finalTop: number;
  width: number;
  side: TutorAvatarAttachmentSide;
  viewport: { width: number; height: number };
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
  rect: DOMRect | null;
  mode: 'bubble' | 'sheet';
  panelLeft?: number;
  panelWidth?: number;
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

  if (input.strategy === 'right' || input.strategy === 'top-right' || input.strategy === 'bottom-right') {
    return 'left';
  }

  if (input.strategy === 'left' || input.strategy === 'top-left' || input.strategy === 'bottom-left') {
    return 'right';
  }

  return 'left';
};

const getAttachedAvatarStyle = (
  side: TutorAvatarAttachmentSide
): CSSProperties => ({
  position: 'absolute',
  top: ATTACHED_AVATAR_EDGE_INSET,
  ...(side === 'left'
    ? { left: -ATTACHED_AVATAR_OVERLAP }
    : { right: -ATTACHED_AVATAR_OVERLAP }),
});

const getAttachedAvatarRect = (input: {
  panelLeft: number;
  panelTop: number;
  panelWidth: number;
  side: TutorAvatarAttachmentSide;
}): DOMRect => {
  const avatarLeft =
    input.side === 'left'
      ? input.panelLeft - ATTACHED_AVATAR_OVERLAP
      : input.panelLeft + input.panelWidth - AVATAR_SIZE + ATTACHED_AVATAR_OVERLAP;

  return createRect(
    avatarLeft,
    input.panelTop + ATTACHED_AVATAR_EDGE_INSET,
    AVATAR_SIZE,
    AVATAR_SIZE
  );
};

const getTutorPointerGeometry = (input: {
  focusRect: DOMRect | null;
  panelLeft: number;
  panelTop: number;
  panelWidth: number;
  side: TutorPointerSide;
}): TutorPointerGeometry | null => {
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
    left: left - input.panelLeft,
    top: top - input.panelTop,
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

const getSelectionActionLayout = (
  rect: DOMRect,
  viewport: { width: number; height: number }
): { style: CSSProperties; placement: 'top' | 'bottom' | 'left' | 'right' } => {
  const gap = 12;
  const maxLeft = viewport.width - EDGE_GAP - CTA_WIDTH;
  const maxTop = viewport.height - EDGE_GAP - CTA_HEIGHT;
  const centeredLeft = rect.left + rect.width / 2 - CTA_WIDTH / 2;
  const centeredTop = rect.top + rect.height / 2 - CTA_HEIGHT / 2;
  const candidates: Array<{
    placement: 'top' | 'bottom' | 'left' | 'right';
    left: number;
    top: number;
    priority: number;
  }> = [
    {
      placement: 'top',
      left: centeredLeft,
      top: rect.top - CTA_HEIGHT - gap,
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
      left: rect.left - CTA_WIDTH - gap,
      top: centeredTop,
      priority: 3,
    },
  ];

  const bestCandidate = candidates
    .map((candidate) => {
      const left = clamp(candidate.left, EDGE_GAP, maxLeft);
      const top = clamp(candidate.top, EDGE_GAP, maxTop);
      const ctaRect = createRect(left, top, CTA_WIDTH, CTA_HEIGHT);
      const overlapArea = getRectOverlapArea(ctaRect, rect);
      const repositionCost = Math.hypot(candidate.left - left, candidate.top - top);
      const score = overlapArea * 20 + repositionCost * 0.7 + candidate.priority * 20;

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
    })[0];

  return {
    placement: bestCandidate.placement,
    style: {
      position: 'fixed',
      left: bestCandidate.left,
      top: bestCandidate.top,
    },
  };
};

const getMotionPositionPoint = (
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

const getFloatingTutorArrowheadGeometry = (input: {
  avatarPoint: TutorPoint | null;
  focusRect: DOMRect | null;
}): FloatingTutorArrowheadGeometry | null => {
  if (!input.avatarPoint || !input.focusRect) {
    return null;
  }

  const avatarRect = getAvatarRectFromPoint(input.avatarPoint);
  const avatarCenterX = avatarRect.left + avatarRect.width / 2;
  const avatarCenterY = avatarRect.top + avatarRect.height / 2;
  const focusCenterX = input.focusRect.left + input.focusRect.width / 2;
  const focusCenterY = input.focusRect.top + input.focusRect.height / 2;
  const deltaX = focusCenterX - avatarCenterX;
  const deltaY = focusCenterY - avatarCenterY;
  const magnitude = Math.hypot(deltaX, deltaY) || 1;
  const unitX = deltaX / magnitude;
  const unitY = deltaY / magnitude;
  const radius = avatarRect.width / 2 - 2 + FLOATING_TUTOR_ARROWHEAD_EXTRUSION_OFFSET_PX;
  const localCenterX = avatarRect.width / 2;
  const localCenterY = avatarRect.height / 2;
  const left = localCenterX + unitX * radius;
  const top = localCenterY + unitY * radius;
  const angle = normalizeRotationDegrees(
    (Math.atan2(deltaY, deltaX) * 180) / Math.PI + FLOATING_TUTOR_ARROWHEAD_ROTATION_OFFSET_DEG
  );
  const side: TutorPointerSide = unitX >= 0 ? 'right' : 'left';
  const absUnitX = Math.abs(unitX);
  const absUnitY = Math.abs(unitY);
  const quadrant =
    absUnitX >= absUnitY
      ? unitX >= 0
        ? 'right'
        : 'left'
      : unitY >= 0
        ? 'bottom'
        : 'top';

  return {
    left,
    top,
    angle,
    side,
    quadrant,
  };
};

const getGuidedCalloutLayout = (
  rect: DOMRect,
  viewport: { width: number; height: number }
): { style: CSSProperties; placement: 'top' | 'bottom' | 'left' | 'right' } => {
  const width = Math.min(280, Math.max(220, viewport.width * 0.24));
  const height = 132;
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
      const repositionCost = Math.hypot(candidate.left - left, candidate.top - top);
      const score = overlapArea * 20 + repositionCost * 0.6 + candidate.priority * 24;

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
    })[0];

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

const getSelectionSpotlightStyle = (rect: DOMRect): CSSProperties => {
  const padding = 10;

  return {
    position: 'fixed',
    left: Math.max(EDGE_GAP, rect.left - padding),
    top: Math.max(EDGE_GAP, rect.top - padding),
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
};

const getBubblePlacement = (
  rect: DOMRect | null,
  viewport: { width: number; height: number },
  mode: 'bubble' | 'sheet',
  widthConfig: {
    desktop: number;
    mobile: number;
  },
  options?: {
    estimatedHeight?: number;
    protectedRects?: DOMRect[];
  }
): {
  style: TutorMotionPosition;
  tailPlacement: 'top' | 'bottom' | 'dock';
  width?: number;
  mode: 'bubble' | 'sheet';
  strategy: TutorBubblePlacementStrategy;
  launchOrigin: 'dock-bottom-right' | 'sheet';
} => {
  if (mode === 'sheet') {
    return {
      mode,
      tailPlacement: 'dock',
      strategy: 'dock',
      launchOrigin: 'sheet',
      style: {
        left: EDGE_GAP,
        right: EDGE_GAP,
        bottom: EDGE_GAP,
      },
    };
  }

  const preferredWidth = Math.min(
    viewport.width - EDGE_GAP * 2,
    viewport.width < 640 ? widthConfig.mobile : widthConfig.desktop
  );

  if (!rect) {
    return {
      mode,
      width: preferredWidth,
      tailPlacement: 'dock',
      strategy: 'dock',
      launchOrigin: 'dock-bottom-right',
      style: {
        left: viewport.width - EDGE_GAP - preferredWidth,
        top: clamp(viewport.height - 440, EDGE_GAP, viewport.height - EDGE_GAP - 220),
      },
    };
  }

  const estimatedHeight = options?.estimatedHeight ?? getEstimatedBubbleHeight(viewport);
  const protectedRects = options?.protectedRects?.filter(Boolean) ?? [];
  const protectedZone = getRectUnion([rect, ...protectedRects]) ?? rect;
  const largestAvailableSideWidth = Math.max(
    protectedZone.left - EDGE_GAP - PROTECTED_CONTENT_GAP,
    viewport.width - protectedZone.right - EDGE_GAP - PROTECTED_CONTENT_GAP
  );
  const minimumAnchoredWidth = Math.min(
    preferredWidth,
    Math.max(280, Math.min(widthConfig.mobile, viewport.width - EDGE_GAP * 2))
  );
  const width =
    largestAvailableSideWidth >= minimumAnchoredWidth
      ? Math.min(preferredWidth, largestAvailableSideWidth)
      : preferredWidth;
  const maxLeft = viewport.width - EDGE_GAP - width;
  const maxTop = viewport.height - EDGE_GAP - estimatedHeight;
  const focusCenterX = rect.left + rect.width / 2;
  const focusCenterY = rect.top + rect.height / 2;
  const centeredLeft = focusCenterX - width / 2;
  const centeredTop = focusCenterY - estimatedHeight / 2;
  const dockRect = getDockAvatarRect(viewport);

  const candidates: Array<{
    strategy: TutorBubblePlacementStrategy;
    tailPlacement: 'top' | 'bottom' | 'dock';
    left: number;
    top: number;
    priority: number;
  }> = [
    {
      strategy: 'right',
      tailPlacement: 'dock',
      left: protectedZone.right + PROTECTED_CONTENT_GAP,
      top: centeredTop,
      priority: 0,
    },
    {
      strategy: 'left',
      tailPlacement: 'dock',
      left: protectedZone.left - PROTECTED_CONTENT_GAP - width,
      top: centeredTop,
      priority: 1,
    },
    {
      strategy: 'above',
      tailPlacement: 'bottom',
      left: centeredLeft,
      top: protectedZone.top - PROTECTED_CONTENT_GAP - estimatedHeight,
      priority: 2,
    },
    {
      strategy: 'below',
      tailPlacement: 'top',
      left: centeredLeft,
      top: protectedZone.bottom + PROTECTED_CONTENT_GAP,
      priority: 3,
    },
    {
      strategy: 'top-right',
      tailPlacement: 'dock',
      left: viewport.width - EDGE_GAP - width,
      top: EDGE_GAP,
      priority: 4,
    },
    {
      strategy: 'top-left',
      tailPlacement: 'dock',
      left: EDGE_GAP,
      top: EDGE_GAP,
      priority: 5,
    },
    {
      strategy: 'bottom-right',
      tailPlacement: 'dock',
      left: viewport.width - EDGE_GAP - width,
      top: viewport.height - EDGE_GAP - estimatedHeight,
      priority: 6,
    },
    {
      strategy: 'bottom-left',
      tailPlacement: 'dock',
      left: EDGE_GAP,
      top: viewport.height - EDGE_GAP - estimatedHeight,
      priority: 7,
    },
  ];

  const bestCandidate = candidates
    .map((candidate) => {
      const left = clamp(candidate.left, EDGE_GAP, maxLeft);
      const top = clamp(candidate.top, EDGE_GAP, maxTop);
      const panelRect = createRect(left, top, width, estimatedHeight);
      const primaryOverlapArea = getRectOverlapArea(panelRect, rect);
      const secondaryOverlapArea = protectedRects.reduce(
        (sum, protectedRect) => sum + getRectOverlapArea(panelRect, protectedRect),
        0
      );
      const repositionCost = Math.hypot(candidate.left - left, candidate.top - top);
      const score =
        primaryOverlapArea * 28 +
        secondaryOverlapArea * 12 +
        repositionCost * 0.5 +
        getPanelCenterDistance(panelRect, dockRect) * 0.08 +
        candidate.priority * 30;

      return {
        candidate,
        left,
        top,
        primaryOverlapArea,
        secondaryOverlapArea,
        score,
      };
    })
    .sort((leftCandidate, rightCandidate) => {
      const leftHasPrimaryOverlap = leftCandidate.primaryOverlapArea > 0 ? 1 : 0;
      const rightHasPrimaryOverlap = rightCandidate.primaryOverlapArea > 0 ? 1 : 0;
      if (leftHasPrimaryOverlap !== rightHasPrimaryOverlap) {
        return leftHasPrimaryOverlap - rightHasPrimaryOverlap;
      }

      if (leftCandidate.primaryOverlapArea !== rightCandidate.primaryOverlapArea) {
        return leftCandidate.primaryOverlapArea - rightCandidate.primaryOverlapArea;
      }

      const leftHasSecondaryOverlap = leftCandidate.secondaryOverlapArea > 0 ? 1 : 0;
      const rightHasSecondaryOverlap = rightCandidate.secondaryOverlapArea > 0 ? 1 : 0;
      if (leftHasSecondaryOverlap !== rightHasSecondaryOverlap) {
        return leftHasSecondaryOverlap - rightHasSecondaryOverlap;
      }

      if (leftCandidate.secondaryOverlapArea !== rightCandidate.secondaryOverlapArea) {
        return leftCandidate.secondaryOverlapArea - rightCandidate.secondaryOverlapArea;
      }

      return leftCandidate.score - rightCandidate.score;
    })[0];

  return {
    mode,
    width,
    tailPlacement: bestCandidate?.candidate.tailPlacement ?? 'dock',
    strategy: bestCandidate?.candidate.strategy ?? 'dock',
    launchOrigin: 'dock-bottom-right',
    style: {
      left: bestCandidate?.left ?? viewport.width - EDGE_GAP - width,
      top: bestCandidate?.top ?? clamp(viewport.height - 440, EDGE_GAP, viewport.height - EDGE_GAP - 220),
    },
  };
};

const getAnchorKindsForSurface = (
  surface: TutorSurface | null | undefined,
  contentId: string | null | undefined,
  answerRevealed: boolean | undefined,
  hasCurrentQuestion: boolean,
  hasAssignmentSummary: boolean
): KangurTutorAnchorKind[] => {
  if (surface === 'lesson') {
    return ['assignment', 'lesson_header', 'document'];
  }

  if (surface === 'test') {
    return answerRevealed ? ['review', 'summary', 'question'] : ['question', 'review', 'summary'];
  }

  if (surface === 'game') {
    if (
      contentId === HOME_ONBOARDING_ELIGIBLE_CONTENT_ID &&
      !answerRevealed &&
      !hasCurrentQuestion &&
      !hasAssignmentSummary
    ) {
      return ['home_actions', 'home_quest', 'priority_assignments', 'progress', 'leaderboard'];
    }

    return answerRevealed ? ['review', 'assignment', 'question'] : ['question', 'assignment'];
  }

  return [];
};

const getFocusChipLabel = (
  focus: ActiveTutorFocus,
  selectedText: string | null,
  surface: TutorSurface | null | undefined
): string | null => {
  if (focus.kind === 'selection') {
    if (surface === 'test') {
      return selectedText ? 'Fragment pytania' : 'Zaznaczony fragment';
    }
    if (surface === 'game') {
      return selectedText ? 'Fragment gry' : 'Zaznaczony fragment';
    }
    return selectedText ? 'Fragment lekcji' : 'Zaznaczony fragment';
  }

  switch (focus.kind) {
    case 'home_actions':
      return 'Start';
    case 'home_quest':
      return 'Misja';
    case 'priority_assignments':
      return 'Zadania od rodzica';
    case 'leaderboard':
      return 'Ranking';
    case 'progress':
      return 'Postep';
    case 'assignment':
      return 'Zadanie od rodzica';
    case 'lesson_header':
      return 'Temat lekcji';
    case 'document':
      return 'Treść lekcji';
    case 'question':
      return 'Aktualne pytanie';
    case 'review':
      return 'Omówienie pytania';
    case 'summary':
      return 'Podsumowanie testu';
    default:
      return null;
  }
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

const normalizeTutorIntentText = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const resolveGuestLoginGuidanceIntent = (
  value: string
): GuidedTutorAuthMode | null => {
  const normalized = normalizeTutorIntentText(value);
  if (!normalized) {
    return null;
  }

  const createAccountPhrases = [
    'create account',
    'create a parent account',
    'how do i create an account',
    'where do i create an account',
    'how do i sign up',
    'sign up',
    'register',
    'parent account',
    'don\'t have an account',
    'dont have an account',
    'konto rodzica',
    'nie mam konta',
    'nie mam jeszcze konta',
    'zalozyc konto',
    'utworzyc konto',
    'jak zalozyc konto',
    'jak utworzyc konto',
  ];
  if (createAccountPhrases.some((phrase) => normalized.includes(phrase))) {
    return 'create-account';
  }

  const loginPhrases = [
    'how do i log in',
    'where do i log in',
    'open login',
    'log in',
    'login',
    'sign in',
    'zalogowac',
    'jak sie zalogowac',
    'gdzie jest logowanie',
    'gdzie sie loguje',
  ];
  if (loginPhrases.some((phrase) => normalized.includes(phrase))) {
    return 'sign-in';
  }

  return null;
};

const getGuidedGuestTargetKind = (
  authMode: GuidedTutorAuthMode
): GuidedTutorAuthKind => {
  return authMode === 'create-account' ? 'create_account_action' : 'login_action';
};

const getGuidedGuestModalTargetKind = (): GuidedTutorAuthKind => 'login_identifier_field';

const getLastAssistantCoachingMode = (
  messages: Array<{
    role: 'user' | 'assistant';
    coachingFrame?: { mode: string } | null;
  }>
): string | null =>
  [...messages].reverse().find((message) => message.role === 'assistant')?.coachingFrame?.mode ??
  null;

const parseCompletedTutorFollowUp = (
  learnerMemory: KangurAiTutorLearnerMemory | null | undefined
): { label: string; reason: string | null } | null => {
  const rawAction = learnerMemory?.lastRecommendedAction?.trim();
  if (rawAction?.startsWith('Completed follow-up:') !== true) {
    return null;
  }

  const payload = rawAction.slice('Completed follow-up:'.length).trim();
  if (!payload) {
    return null;
  }

  const separatorIndex = payload.indexOf(':');
  const label =
    separatorIndex === -1 ? payload.trim() : payload.slice(0, separatorIndex).trim();
  const reason =
    separatorIndex === -1 ? null : payload.slice(separatorIndex + 1).trim() || null;

  return label ? { label, reason } : null;
};

const buildCompletedFollowUpBridgeQuickAction = (input: {
  surface: TutorSurface | null | undefined;
  answerRevealed: boolean | undefined;
  hasCurrentQuestion: boolean;
  learnerMemory: KangurAiTutorLearnerMemory | null | undefined;
  title: string | null | undefined;
}): TutorQuickAction | null => {
  const completedFollowUp = parseCompletedTutorFollowUp(input.learnerMemory);
  if (!completedFollowUp) {
    return null;
  }

  if (input.surface === 'lesson') {
    const lessonTitle = input.title?.trim();
    return {
      id: 'bridge-to-game',
      label: 'Po lekcji: trening',
      prompt: lessonTitle
        ? `Pomóż mi wybrać jeden konkretny trening po tej lekcji: ${lessonTitle}.`
        : 'Pomóż mi wybrać jeden konkretny trening po tej lekcji.',
      promptMode: 'chat',
      interactionIntent: 'next_step',
    };
  }

  if (
    input.surface === 'game' &&
    (!input.hasCurrentQuestion || input.answerRevealed)
  ) {
    return {
      id: 'bridge-to-lesson',
      label: 'Po treningu: lekcja',
      prompt: 'Pomóż mi wybrać jedną konkretną lekcję po tym treningu.',
      promptMode: 'chat',
      interactionIntent: 'next_step',
    };
  }

  return null;
};

const getBridgeSummaryChipLabel = (
  bridgeQuickAction: TutorQuickAction | null
): string | null => {
  if (!bridgeQuickAction) {
    return null;
  }

  return bridgeQuickAction.id === 'bridge-to-game'
    ? 'Most: po lekcji'
    : bridgeQuickAction.id === 'bridge-to-lesson'
      ? 'Most: po treningu'
      : null;
};

const buildQuickActions = (input: {
  surface: TutorSurface | null | undefined;
  answerRevealed: boolean | undefined;
  hasSelectedText: boolean;
  hasMessages: boolean;
  hasCurrentQuestion: boolean;
  hasAssignmentSummary: boolean;
  focusKind: ActiveTutorFocus['kind'];
  isLoading: boolean;
  lastAssistantCoachingMode: string | null;
  learnerMemory: KangurAiTutorLearnerMemory | null | undefined;
  title: string | null | undefined;
}): TutorQuickAction[] => {
  const actions: TutorQuickAction[] = [];
  const isQuestionSurface =
    input.surface === 'test' || (input.surface === 'game' && input.hasCurrentQuestion);
  const isReviewSurface =
    (input.surface === 'test' || input.surface === 'game') && input.answerRevealed;
  const bridgeAction = buildCompletedFollowUpBridgeQuickAction({
    surface: input.surface,
    answerRevealed: input.answerRevealed,
    hasCurrentQuestion: input.hasCurrentQuestion,
    learnerMemory: input.learnerMemory,
    title: input.title,
  });

  if (isReviewSurface) {
    if (bridgeAction) {
      actions.push(bridgeAction);
    }
    actions.push({
      id: 'review',
      label: input.hasCurrentQuestion ? 'Omow odpowiedz' : input.surface === 'game' ? 'Omow gre' : 'Omow wynik',
      prompt: input.hasCurrentQuestion
        ? 'Omów to pytanie: co poszło dobrze, gdzie był błąd i co sprawdzić następnym razem.'
        : input.surface === 'game'
          ? 'Omów moją ostatnią grę: co poszło dobrze i co warto ćwiczyć dalej.'
          : 'Omów mój wynik testu: co poszło dobrze i co warto poprawić następnym razem.',
      promptMode: 'explain',
      interactionIntent: 'review',
    });
    actions.push({
      id: 'next-step',
      label: input.hasCurrentQuestion ? 'Co poprawic?' : 'Co cwiczyc?',
      prompt: input.hasCurrentQuestion
        ? 'Powiedz, co ćwiczyć dalej po tym pytaniu.'
        : input.surface === 'game'
          ? 'Powiedz, jaki powinien być mój następny krok po tej grze.'
          : 'Powiedz, jaki powinien być mój następny krok po tym teście.',
      promptMode: 'chat',
      interactionIntent: 'next_step',
    });
  } else if (isQuestionSurface) {
    if (input.lastAssistantCoachingMode === 'misconception_check') {
      actions.push({
        id: 'how-think',
        label: 'Co myle?',
        prompt:
          'Pomóż mi znaleźć, gdzie mogę mylić sposób myślenia, bez podawania odpowiedzi.',
        promptMode: 'explain',
        interactionIntent: 'explain',
      });
      actions.push({
        id: 'hint',
        label: 'Inny trop',
        prompt: 'Daj mi inny mały trop, ale bez gotowej odpowiedzi.',
        promptMode: 'hint',
        interactionIntent: 'hint',
      });
    } else if (input.lastAssistantCoachingMode === 'hint_ladder') {
      actions.push({
        id: 'how-think',
        label: 'Jak myslec dalej?',
        prompt: 'Pomóż mi sprawdzić tok myślenia krok po kroku, bez podawania odpowiedzi.',
        promptMode: 'explain',
        interactionIntent: 'explain',
      });
      actions.push({
        id: 'hint',
        label: 'Inny trop',
        prompt: 'Daj mi inny mały trop, ale bez gotowej odpowiedzi.',
        promptMode: 'hint',
        interactionIntent: 'hint',
      });
    } else {
      actions.push({
        id: 'hint',
        label: 'Podpowiedz',
        prompt: 'Daj mi małą podpowiedź, ale bez gotowej odpowiedzi.',
        promptMode: 'hint',
        interactionIntent: 'hint',
      });
      actions.push({
        id: 'how-think',
        label: 'Jak myslec?',
        prompt: 'Wyjaśnij, jak podejść do tego pytania krok po kroku, bez podawania odpowiedzi.',
        promptMode: 'explain',
        interactionIntent: 'explain',
      });
    }
  } else {
    const explainAction: TutorQuickAction = {
      id: 'explain',
      label:
        input.focusKind === 'assignment' || input.hasAssignmentSummary ? 'Wyjasnij temat' : 'Wyjasnij',
      prompt: input.hasSelectedText
        ? 'Wyjaśnij ten fragment prostymi słowami.'
        : 'Wyjaśnij mi to prostymi słowami.',
      promptMode: 'explain',
      interactionIntent: 'explain',
    };
    const nextStepAction: TutorQuickAction = {
      id: 'next-step',
      label: input.focusKind === 'assignment' || input.hasAssignmentSummary ? 'Plan zadania' : 'Co dalej?',
      prompt:
        input.focusKind === 'assignment' || input.hasAssignmentSummary
          ? input.surface === 'game'
            ? 'Powiedz, jaki ma byc moj nastepny krok w tym zadaniu i w tej grze.'
            : 'Powiedz, jaki ma być mój następny krok w tym zadaniu i w tej lekcji.'
          : input.surface === 'game'
            ? 'Powiedz, co warto cwiczyc dalej na podstawie mojej gry.'
            : 'Powiedz, co warto ćwiczyć dalej na podstawie mojego postępu.',
      promptMode: 'chat',
      interactionIntent: 'next_step',
    };
    const hintAction: TutorQuickAction = {
      id: 'hint',
      label: 'Podpowiedz',
      prompt: 'Daj mi małą podpowiedź, ale bez gotowej odpowiedzi.',
      promptMode: 'hint',
      interactionIntent: 'hint',
    };

    if (bridgeAction) {
      actions.push(bridgeAction);
    }
    if (input.lastAssistantCoachingMode === 'next_best_action') {
      actions.push(nextStepAction, explainAction, hintAction);
    } else {
      actions.push(hintAction, explainAction, nextStepAction);
    }
  }

  if (input.hasSelectedText && !input.hasMessages && !input.isLoading) {
    actions.push({
      id: 'selected-text',
      label: 'Ten fragment',
      prompt: 'Wytłumacz ten zaznaczony fragment prostymi słowami.',
      promptMode: 'selected_text',
      interactionIntent: 'explain',
    });
  }

  return actions;
};

const pickQuickAction = (
  actions: TutorQuickAction[],
  preferredIds: string[]
): TutorQuickAction | null => {
  for (const id of preferredIds) {
    const action = actions.find((candidate) => candidate.id === id);
    if (action) {
      return action;
    }
  }

  return actions[0] ?? null;
};

const buildProactiveNudge = (input: {
  proactiveNudges: 'off' | 'gentle' | 'coach';
  hintDepth: 'brief' | 'guided' | 'step_by_step';
  surface: TutorSurface | null | undefined;
  answerRevealed: boolean | undefined;
  hasSelectedText: boolean;
  hasCurrentQuestion: boolean;
  hasAssignmentSummary: boolean;
  quickActions: TutorQuickAction[];
  hasMessages: boolean;
  canSendMessages: boolean;
}): TutorProactiveNudge | null => {
  if (
    input.proactiveNudges === 'off' ||
    input.hasMessages ||
    !input.canSendMessages ||
    input.quickActions.length === 0
  ) {
    return null;
  }

  const isQuestionSurface =
    input.surface === 'test' || (input.surface === 'game' && input.hasCurrentQuestion);
  const isReviewSurface =
    (input.surface === 'test' || input.surface === 'game') && input.answerRevealed;
  const title =
    input.proactiveNudges === 'coach' ? 'Tutor sugeruje start' : 'Sugerowany pierwszy krok';
  const bridgeAction = pickQuickAction(input.quickActions, ['bridge-to-game', 'bridge-to-lesson']);

  if (input.hasSelectedText) {
    const action = pickQuickAction(input.quickActions, ['selected-text', 'explain']);
    return action
      ? {
        mode: input.proactiveNudges,
        title,
        description:
          input.proactiveNudges === 'coach'
            ? 'Masz zaznaczony fragment, wiec tutor proponuje najpierw rozbroic tylko ten kawalek.'
            : 'Zacznij od krotkiego wyjasnienia zaznaczonego fragmentu.',
        action,
      }
      : null;
  }

  if (bridgeAction) {
    return {
      mode: input.proactiveNudges,
      title,
      description:
        bridgeAction.id === 'bridge-to-game'
          ? input.proactiveNudges === 'coach'
            ? 'Tutor proponuje od razu zamienic te lekcje w jeden konkretny trening.'
            : 'Zacznij od jednego konkretnego treningu po tej lekcji.'
          : input.proactiveNudges === 'coach'
            ? 'Tutor proponuje domknac ten trening jedna pasujaca lekcja.'
            : 'Zapytaj o jedna konkretna lekcje po tym treningu.'
      ,
      action: bridgeAction,
    };
  }

  if (isReviewSurface) {
    const action = pickQuickAction(input.quickActions, ['review', 'next-step']);
    return action
      ? {
        mode: input.proactiveNudges,
        title,
        description:
          input.proactiveNudges === 'coach'
            ? 'Tutor sugeruje najpierw omowic probe, a dopiero potem wybierac dalsze cwiczenie.'
            : 'Najspokojniej będzie zacząć od krótkiego omówienia ostatniej próby.',
        action,
      }
      : null;
  }

  if (isQuestionSurface) {
    const action = pickQuickAction(
      input.quickActions,
      input.hintDepth === 'step_by_step' ? ['how-think', 'hint'] : ['hint', 'how-think']
    );
    return action
      ? {
        mode: input.proactiveNudges,
        title,
        description:
          input.hintDepth === 'step_by_step'
            ? input.proactiveNudges === 'coach'
              ? 'Tutor proponuje wejść od razu w plan myślenia krok po kroku.'
              : 'Najlepiej zacząć od planu myślenia krok po kroku.'
            : input.proactiveNudges === 'coach'
              ? 'Tutor sugeruje jedna szybka wskazowke, zeby ruszyc bez zdradzania odpowiedzi.'
              : 'Jedna mala wskazowka powinna wystarczyc, zeby ruszyc dalej.',
        action,
      }
      : null;
  }

  if (input.hasAssignmentSummary) {
    const action = pickQuickAction(input.quickActions, ['next-step', 'explain']);
    return action
      ? {
        mode: input.proactiveNudges,
        title,
        description:
          input.proactiveNudges === 'coach'
            ? 'Tutor sugeruje teraz wybrac jeden konkretny nastepny ruch do zadania.'
            : 'Popros o jeden konkretny kolejny krok do tego zadania.',
        action,
      }
      : null;
  }

  const action = pickQuickAction(
    input.quickActions,
    input.proactiveNudges === 'coach'
      ? ['next-step', 'explain', 'hint']
      : ['explain', 'hint', 'next-step']
  );
  return action
    ? {
      mode: input.proactiveNudges,
      title,
      description:
        input.proactiveNudges === 'coach'
          ? 'Tutor sugeruje od razu ustawic nastepny kierunek pracy.'
          : 'Krotki start od wyjasnienia albo kolejnego kroku zwykle dziala najlepiej.',
      action,
    }
    : null;
};

const getEmptyStateMessage = (input: {
  surface: TutorSurface | null | undefined;
  answerRevealed: boolean | undefined;
  hasCurrentQuestion: boolean;
  hasAssignmentSummary: boolean;
  hasSelectedText: boolean;
  bridgeQuickAction: TutorQuickAction | null;
}): string => {
  if (input.hasSelectedText) {
    return 'Masz zaznaczony fragment. Poproś o wyjaśnienie albo kolejny krok.';
  }

  if ((input.surface === 'test' || input.surface === 'game') && !input.answerRevealed && input.hasCurrentQuestion) {
    return 'Poproś o wskazówkę do tego pytania. Tutor nie poda gotowej odpowiedzi.';
  }

  if (input.bridgeQuickAction?.id === 'bridge-to-game') {
    return 'Masz juz wykonany poprzedni krok. Zapytaj o jeden konkretny trening po tej lekcji.';
  }

  if (input.bridgeQuickAction?.id === 'bridge-to-lesson') {
    return 'Masz juz wykonany poprzedni krok. Zapytaj o jedna konkretna lekcje po tym treningu.';
  }

  if ((input.surface === 'test' || input.surface === 'game') && input.answerRevealed) {
    return input.hasCurrentQuestion
      ? 'Poproś o omówienie odpowiedzi albo o kolejny krok do ćwiczenia.'
      : input.surface === 'game'
        ? 'Poproś o omówienie gry albo plan następnych ćwiczeń.'
        : 'Poproś o omówienie wyniku albo plan następnych ćwiczeń.';
  }

  if (input.hasAssignmentSummary) {
    return 'Poproś o plan wykonania zadania albo krótkie wyjaśnienie tematu.';
  }

  if (input.surface === 'game') {
    return 'Masz pytanie dotyczace gry? Popros o wyjasnienie albo nastepny krok.';
  }

  return 'Masz pytanie dotyczące lekcji? Poproś o wyjaśnienie albo następny krok.';
};

const getInputPlaceholder = (input: {
  canSendMessages: boolean;
  surface: TutorSurface | null | undefined;
  answerRevealed: boolean | undefined;
  hasCurrentQuestion: boolean;
  hasAssignmentSummary: boolean;
  hasSelectedText: boolean;
  bridgeQuickAction: TutorQuickAction | null;
}): string => {
  if (!input.canSendMessages) {
    return 'Dzienny limit wiadomosci wykorzystany';
  }

  if (input.hasSelectedText) {
    return 'Zapytaj o zaznaczony fragment';
  }

  if ((input.surface === 'test' || input.surface === 'game') && !input.answerRevealed && input.hasCurrentQuestion) {
    return 'Popros o wskazowke do pytania';
  }

  if (input.bridgeQuickAction?.id === 'bridge-to-game') {
    return 'Zapytaj o trening po tej lekcji';
  }

  if (input.bridgeQuickAction?.id === 'bridge-to-lesson') {
    return 'Zapytaj o lekcje po tym treningu';
  }

  if ((input.surface === 'test' || input.surface === 'game') && input.answerRevealed) {
    return input.hasCurrentQuestion
      ? 'Popros o omowienie odpowiedzi'
      : input.surface === 'game'
        ? 'Zapytaj o gre lub nastepny krok'
        : 'Zapytaj o wynik lub nastepny krok';
  }

  if (input.hasAssignmentSummary) {
    return 'Zapytaj o zadanie lub kolejny krok';
  }

  if (input.surface === 'game') {
    return 'Zapytaj o gre';
  }

  return 'Pytaj…';
};

const toFollowUpHref = (
  basePath: string,
  action: KangurAiTutorFollowUpAction
): string =>
  buildKangurRecommendationHref(basePath, {
    label: action.label,
    page: action.page,
    query: action.query,
  });

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

const getTutorSessionKey = (
  sessionContext: KangurAiTutorConversationContext | null | undefined
): string | null => {
  if (!sessionContext) {
    return null;
  }

  return `${sessionContext.surface}:${sessionContext.contentId ?? sessionContext.title ?? 'none'}`;
};

const getContextSwitchNotice = (input: {
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
    input.surface === 'test' ? 'Test' : input.surface === 'game' ? 'Gra' : 'Lekcja';
  const targetLabel = input.title?.trim()
    ? `${surfaceLabel}: ${input.title.trim()}`
    : input.contentId?.trim()
      ? `${surfaceLabel}: ${input.contentId.trim()}`
      : input.surface === 'test'
        ? 'Nowe pytanie testowe'
        : input.surface === 'game'
          ? 'Nowy etap gry'
          : 'Nowy fragment lekcji';
  const detail = input.questionProgressLabel?.trim()
    ? input.questionProgressLabel.trim()
    : input.questionId?.trim()
      ? 'Tutor ustawia się pod aktualne pytanie.'
      : input.assignmentSummary?.trim()
        ? 'Tutor ustawia się pod aktywne zadanie.'
        : input.assignmentId?.trim()
          ? 'Tutor ustawia się pod aktywne zadanie.'
          : null;

  return {
    title: 'Nowe miejsce pomocy',
    target: targetLabel,
    detail,
  };
};

const getMotionPresetKind = (
  motionPresetId: string | null | undefined
): KangurAiTutorMotionPresetKind => {
  return resolveKangurAiTutorMotionPresetKind(motionPresetId);
};

const getTutorMotionProfile = (
  motionPresetId: string | null | undefined
): TutorMotionProfile => {
  switch (getMotionPresetKind(motionPresetId)) {
    case 'mobile':
      return {
        kind: 'mobile',
        sheetBreakpoint: 840,
        avatarTransition: { type: 'spring', stiffness: 250, damping: 30 },
        guidedAvatarTransition: { type: 'tween', duration: 0.72, ease: [0.22, 1, 0.36, 1] },
        bubbleTransition: { type: 'spring', stiffness: 235, damping: 30 },
        hoverScale: 1.03,
        tapScale: 0.97,
        motionCompletedDelayMs: 420,
        desktopBubbleWidth: 360,
        mobileBubbleWidth: 320,
      };
    case 'tablet':
      return {
        kind: 'tablet',
        sheetBreakpoint: 960,
        avatarTransition: { type: 'spring', stiffness: 280, damping: 30 },
        guidedAvatarTransition: { type: 'tween', duration: 0.66, ease: [0.22, 1, 0.36, 1] },
        bubbleTransition: { type: 'spring', stiffness: 250, damping: 30 },
        hoverScale: 1.04,
        tapScale: 0.96,
        motionCompletedDelayMs: 400,
        desktopBubbleWidth: 408,
        mobileBubbleWidth: 336,
      };
    case 'desktop':
      return {
        kind: 'desktop',
        sheetBreakpoint: 680,
        avatarTransition: { type: 'spring', stiffness: 320, damping: 28 },
        guidedAvatarTransition: { type: 'tween', duration: 0.58, ease: [0.22, 1, 0.36, 1] },
        bubbleTransition: { type: 'spring', stiffness: 300, damping: 28 },
        hoverScale: 1.06,
        tapScale: 0.94,
        motionCompletedDelayMs: 360,
        desktopBubbleWidth: 392,
        mobileBubbleWidth: 320,
      };
    default:
      return {
        kind: 'default',
        sheetBreakpoint: 640,
        avatarTransition: { type: 'spring', stiffness: 320, damping: 28 },
        guidedAvatarTransition: { type: 'tween', duration: 0.58, ease: [0.22, 1, 0.36, 1] },
        bubbleTransition: { type: 'spring', stiffness: 300, damping: 28 },
        hoverScale: 1.06,
        tapScale: 0.94,
        motionCompletedDelayMs: 360,
        desktopBubbleWidth: DESKTOP_BUBBLE_WIDTH,
        mobileBubbleWidth: MOBILE_BUBBLE_WIDTH,
      };
  }
};

const getFocusTelemetryKey = (
  sessionKey: string | null,
  focus: ActiveTutorFocus
): string | null => {
  if (!sessionKey || !focus.kind) {
    return null;
  }

  return `${sessionKey}:${focus.kind}:${focus.id ?? 'none'}`;
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

export function KangurAiTutorWidget(): React.JSX.Element | null {
  const prefersReducedMotion = useReducedMotion();
  const tutorRuntime = useKangurAiTutor();
  const settingsStore = useSettingsStore();
  const authState = useOptionalKangurAuth();
  const loginModal = useKangurLoginModal();
  const {
    enabled,
    tutorSettings,
    isOpen,
    messages,
    isLoading,
    isUsageLoading,
    tutorName,
    tutorMoodId,
    tutorAvatarSvg,
    tutorAvatarImageUrl,
    highlightedText,
    usageSummary,
    learnerMemory,
    openChat,
    closeChat,
    sendMessage,
    recordFollowUpCompletion,
    setHighlightedText,
  } = tutorRuntime;
  const tutorBehaviorMoodId = tutorRuntime.tutorBehaviorMoodId ?? 'neutral';
  const tutorBehaviorMoodLabel = tutorRuntime.tutorBehaviorMoodLabel ?? 'Neutralny';
  const tutorBehaviorMoodDescription =
    tutorRuntime.tutorBehaviorMoodDescription ??
    'Stabilny punkt wyjscia, gdy nie potrzeba silniejszego tonu.';
  const sessionContext = tutorRuntime.sessionContext;
  const pageContextRegistry = useOptionalContextRegistryPageEnvelope();
  const rawNarratorSettings = settingsStore.get(KANGUR_NARRATOR_SETTINGS_KEY);
  const narratorSettings = useMemo(
    () => parseKangurNarratorSettings(rawNarratorSettings),
    [rawNarratorSettings]
  );
  const tutorNarratorContextRegistry = useMemo(
    () =>
      pageContextRegistry
        ? buildContextRegistryConsumerEnvelope({
          refs: pageContextRegistry.refs,
          resolved: pageContextRegistry.resolved ?? null,
          rootNodeIds: [...KANGUR_AI_TUTOR_NARRATOR_CONTEXT_ROOT_IDS],
        })
        : null,
    [pageContextRegistry]
  );
  const { selectedText, selectionRect, selectionContainerRect, clearSelection } = useKangurTextHighlight();
  const tutorAnchorContext = useOptionalKangurTutorAnchors();
  const routing = useOptionalKangurRouting();
  const [mounted, setMounted] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [isTutorHidden, setIsTutorHidden] = useState(() => loadPersistedTutorVisibilityHidden());
  const [launcherPromptVisible, setLauncherPromptVisible] = useState(false);
  const [guestIntroVisible, setGuestIntroVisible] = useState(false);
  const [guestIntroHelpVisible, setGuestIntroHelpVisible] = useState(false);
  const [guidedTutorTarget, setGuidedTutorTarget] = useState<GuidedTutorTarget | null>(null);
  const [homeOnboardingStepIndex, setHomeOnboardingStepIndex] = useState<number | null>(null);
  const [askModalVisible, setAskModalVisible] = useState(false);
  const [askEntrySource, setAskEntrySource] = useState<TutorAskEntrySource>('guest_intro');
  const [askModalDockStyle, setAskModalDockStyle] = useState<TutorMotionPosition | null>(null);
  const [draggedAvatarPoint, setDraggedAvatarPoint] = useState<TutorPoint | null>(() => {
    const persisted = loadPersistedTutorAvatarPosition();
    if (!persisted) {
      return null;
    }

    return {
      x: persisted.left,
      y: persisted.top,
    };
  });
  const [isAvatarDragging, setIsAvatarDragging] = useState(false);
  const [messageFeedbackByKey, setMessageFeedbackByKey] = useState<
    Record<string, TutorMessageFeedback>
  >({});
  const [panelMotionState, setPanelMotionState] = useState<'animating' | 'settled'>('settled');
  const [panelMeasuredHeight, setPanelMeasuredHeight] = useState<number | null>(null);
  const [persistedSelectionRect, setPersistedSelectionRect] = useState<DOMRect | null>(null);
  const [persistedSelectionPageRect, setPersistedSelectionPageRect] = useState<DOMRect | null>(null);
  const [persistedSelectionContainerRect, setPersistedSelectionContainerRect] = useState<DOMRect | null>(null);
  const [dismissedSelectedText, setDismissedSelectedText] = useState<string | null>(null);
  const [selectionContextSpotlightTick, setSelectionContextSpotlightTick] = useState(0);
  const [contextSwitchNotice, setContextSwitchNotice] = useState<{
    title: string;
    target: string;
    detail: string | null;
  } | null>(null);
  const [viewportTick, setViewportTick] = useState(0);
  const [tutorNarrationObservedText, setTutorNarrationObservedText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const tutorNarrationRootRef = useRef<HTMLDivElement | null>(null);
  const persistedSessionKey = useMemo(() => loadPersistedTutorSessionKey(), []);
  const [guestIntroRecord, setGuestIntroRecord] = useState<KangurAiTutorGuestIntroRecord | null>(
    () => loadPersistedGuestIntroRecord()
  );
  const [homeOnboardingRecord, setHomeOnboardingRecord] =
    useState<KangurAiTutorHomeOnboardingRecord | null>(() => loadPersistedHomeOnboardingRecord());
  const previousSessionKeyRef = useRef<string | null>(persistedSessionKey);
  const lastTrackedFocusKeyRef = useRef<string | null>(null);
  const lastTrackedProactiveNudgeKeyRef = useRef<string | null>(null);
  const lastTrackedQuotaKeyRef = useRef<string | null>(null);
  const guestIntroCheckStartedRef = useRef(false);
  const guestIntroLocalSuppressionTrackedRef = useRef(false);
  const motionTimeoutRef = useRef<number | null>(null);
  const selectionExplainTimeoutRef = useRef<number | null>(null);
  const guestIntroShownForCurrentEntryRef = useRef(false);
  const homeOnboardingShownForCurrentEntryRef = useRef(false);
  const avatarDragStateRef = useRef<TutorAvatarDragState | null>(null);
  const suppressAvatarClickRef = useRef(false);
  const askModalReturnStateRef = useRef<{
    wasOpen: boolean;
    launcherPromptVisible: boolean;
    guestIntroVisible: boolean;
    guestIntroHelpVisible: boolean;
    guidedTutorTarget: GuidedTutorTarget | null;
  } | null>(null);
  const uiMode = tutorSettings?.uiMode ?? 'anchored';
  const isAnchoredUiMode = uiMode !== 'static';
  const allowCrossPagePersistence = tutorSettings?.allowCrossPagePersistence ?? true;
  const allowSelectedTextSupport = tutorSettings?.allowSelectedTextSupport ?? true;
  const showSources = tutorSettings?.showSources ?? true;
  const proactiveNudges = tutorSettings?.proactiveNudges ?? 'gentle';
  const hintDepth = tutorSettings?.hintDepth ?? 'guided';
  useRegisterContextRegistryPageSource(
    'kangur-ai-tutor-narrator',
    useMemo(
      () => ({
        label: 'Kangur AI Tutor narrator',
        rootNodeIds: [...KANGUR_AI_TUTOR_NARRATOR_CONTEXT_ROOT_IDS],
      }),
      []
    )
  );
  const guestIntroMode = tutorRuntime.appSettings?.guestIntroMode ?? 'first_visit';
  const homeOnboardingMode = tutorRuntime.appSettings?.homeOnboardingMode ?? 'first_visit';
  const shouldRepeatGuestIntroOnEntry = guestIntroMode === 'every_visit';
  const shouldRepeatHomeOnboardingOnEntry = homeOnboardingMode === 'every_visit';
  const rawSelectedText = allowSelectedTextSupport ? (selectedText ?? highlightedText)?.trim() || null : null;
  const activeSelectedText =
    rawSelectedText && rawSelectedText === dismissedSelectedText ? null : rawSelectedText;
  const liveSelectionPageRect = selectionRect ? getPageRect(selectionRect) : null;
  const activeSelectionRect = activeSelectedText
    ? selectionRect ??
      getViewportRectFromPageRect(persistedSelectionPageRect) ??
      persistedSelectionRect
    : null;
  const activeSelectionPageRect = activeSelectedText
    ? liveSelectionPageRect ?? persistedSelectionPageRect
    : null;
  const activeSelectionContainerRect = activeSelectedText
    ? selectionContainerRect ?? persistedSelectionContainerRect
    : null;
  const activeSelectionProtectedRect = activeSelectedText
    ? getSelectionProtectedRect(activeSelectionRect, activeSelectionContainerRect)
    : null;
  const remainingMessages = usageSummary?.remainingMessages ?? null;
  const canSendMessages = remainingMessages !== 0;
  const basePath = routing?.basePath ?? KANGUR_BASE_PATH;
  const isAnonymousVisitor = Boolean(
    mounted && authState && !authState.isLoadingAuth && !authState.isAuthenticated
  );
  const shouldRenderGuestIntroUi = !isTutorHidden && (guestIntroVisible || guestIntroHelpVisible);
  const telemetryContext = {
    surface: sessionContext?.surface ?? null,
    contentId: sessionContext?.contentId ?? null,
    title: sessionContext?.title ?? null,
  };
  const persistSelectionGeometry = useCallback((): void => {
    if (selectionRect) {
      setPersistedSelectionRect(cloneRect(selectionRect));
      setPersistedSelectionPageRect(getPageRect(selectionRect));
    }

    if (selectionContainerRect) {
      setPersistedSelectionContainerRect(cloneRect(selectionContainerRect));
    }
  }, [selectionContainerRect, selectionRect]);
  const hasCurrentQuestion = Boolean(
    sessionContext?.questionId?.trim() || sessionContext?.currentQuestion?.trim()
  );
  const hasAssignmentSummary = Boolean(
    sessionContext?.assignmentId?.trim() || sessionContext?.assignmentSummary?.trim()
  );
  const shouldOfferLauncherPrompt =
    messages.length === 0 &&
    !activeSelectedText &&
    !hasCurrentQuestion &&
    !hasAssignmentSummary &&
    !guestIntroVisible &&
    !guestIntroHelpVisible &&
    !guidedTutorTarget &&
    homeOnboardingStepIndex === null;
  const tutorSessionKey = useMemo(
    () => getTutorSessionKey(sessionContext ?? null),
    [sessionContext]
  );
  const viewport = useMemo(() => getViewport(), [mounted, viewportTick]);
  const motionProfile = useMemo(
    () => getTutorMotionProfile(tutorSettings?.motionPresetId),
    [tutorSettings?.motionPresetId]
  );
  const reducedMotionTransitions = useMemo(
    () => ({
      instant: { duration: 0 },
      stableState: { opacity: 1, y: 0, scale: 1 },
      staticSheetState: { opacity: 1, y: 0 },
    }),
    []
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (authState?.isAuthenticated) {
      setGuidedTutorTarget(null);
      setGuestIntroVisible(false);
      setGuestIntroHelpVisible(false);
      return;
    }

    setHomeOnboardingStepIndex(null);
  }, [authState?.isAuthenticated]);

  useEffect(() => subscribeToTutorVisibilityChanges(setIsTutorHidden), []);

  useEffect(() => {
    if (!draggedAvatarPoint) {
      return;
    }

    const clampedPoint = clampAvatarPoint(draggedAvatarPoint, viewport);
    if (clampedPoint.x === draggedAvatarPoint.x && clampedPoint.y === draggedAvatarPoint.y) {
      return;
    }

    setDraggedAvatarPoint(clampedPoint);
    persistTutorAvatarPosition({
      left: clampedPoint.x,
      top: clampedPoint.y,
    });
  }, [draggedAvatarPoint, viewport]);

  useEffect(() => {
    if (isTutorHidden) {
      setGuestIntroVisible(false);
      setGuestIntroHelpVisible(false);
      return;
    }

    if (!mounted || !authState || authState.isLoadingAuth) {
      return;
    }

    if (authState.isAuthenticated) {
      setGuestIntroVisible(false);
      setGuestIntroHelpVisible(false);
      return;
    }

    if (shouldRepeatGuestIntroOnEntry) {
      if (guestIntroShownForCurrentEntryRef.current) {
        return;
      }

      guestIntroShownForCurrentEntryRef.current = true;
      guestIntroLocalSuppressionTrackedRef.current = false;
      const nextRecord = persistGuestIntroRecord('shown');
      setGuestIntroRecord(nextRecord);
      setGuestIntroVisible(true);
      trackKangurClientEvent('kangur_ai_tutor_guest_intro_shown', {
        reason: 'admin_every_visit',
      });
      return;
    }

    if (guestIntroRecord) {
      if (
        !guestIntroVisible &&
        !guestIntroHelpVisible &&
        !guestIntroLocalSuppressionTrackedRef.current
      ) {
        guestIntroLocalSuppressionTrackedRef.current = true;
        trackKangurClientEvent('kangur_ai_tutor_guest_intro_suppressed_local', {
          status: guestIntroRecord.status,
        });
      }
      return;
    }

    if (guestIntroCheckStartedRef.current) {
      return;
    }

    guestIntroCheckStartedRef.current = true;
    let cancelled = false;

    void fetch('/api/kangur/ai-tutor/guest-intro', {
      cache: 'no-store',
      credentials: 'same-origin',
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response.json().catch(() => null)) as KangurAiTutorGuestIntroCheckResponse | null;
      })
      .then((payload) => {
        if (cancelled || !payload) {
          return;
        }

        guestIntroLocalSuppressionTrackedRef.current = false;

        trackKangurClientEvent('kangur_ai_tutor_guest_intro_checked', {
          reason: payload.reason ?? null,
          shouldShow: payload.shouldShow === true,
        });

        if (payload.shouldShow !== true) {
          trackKangurClientEvent('kangur_ai_tutor_guest_intro_suppressed_server_seen', {
            reason: payload.reason ?? null,
          });
          return;
        }

        const nextRecord = persistGuestIntroRecord('shown');
        setGuestIntroRecord(nextRecord);
        setGuestIntroVisible(true);
        trackKangurClientEvent('kangur_ai_tutor_guest_intro_shown', {
          reason: payload.reason ?? null,
        });
      })
      .catch(() => {
        // Keep the prompt best-effort and silent on network failures.
      });

    return () => {
      cancelled = true;
    };
  }, [
    authState,
    guestIntroHelpVisible,
    guestIntroRecord,
    guestIntroVisible,
    isTutorHidden,
    mounted,
    shouldRepeatGuestIntroOnEntry,
  ]);

  useEffect(() => {
    if (!isTutorHidden) {
      return;
    }

    setAskModalVisible(false);
    askModalReturnStateRef.current = null;
    setLauncherPromptVisible(false);
    setGuidedTutorTarget(null);
    setGuestIntroVisible(false);
    setGuestIntroHelpVisible(false);
    setHomeOnboardingStepIndex(null);
    setHasNewMessage(false);
    setDismissedSelectedText(null);
    clearSelection();
    setHighlightedText(null);
    setPersistedSelectionRect(null);
    setPersistedSelectionPageRect(null);
    setPersistedSelectionContainerRect(null);
    closeChat();
  }, [
    clearSelection,
    closeChat,
    isTutorHidden,
    setHighlightedText,
    setPersistedSelectionPageRect,
    setPersistedSelectionContainerRect,
    setPersistedSelectionRect,
  ]);

  useEffect(() => {
    if (!mounted) return;

    let rafId = 0;
    const handleViewportChange = (): void => {
      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        setViewportTick((current) => current + 1);
      });
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [mounted]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPanelMeasuredHeight(null);
      return;
    }

    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const updateMeasuredHeight = (): void => {
      const nextHeight = Math.ceil(panel.getBoundingClientRect().height);
      if (nextHeight <= 0) {
        return;
      }

      setPanelMeasuredHeight((current) => (current === nextHeight ? current : nextHeight));
    };

    updateMeasuredHeight();

    if (typeof ResizeObserver !== 'function') {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateMeasuredHeight();
    });
    observer.observe(panel);

    return () => {
      observer.disconnect();
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!askModalVisible || !isOpen || isTutorHidden || typeof document === 'undefined') {
      setAskModalDockStyle(null);
      return;
    }

    let frameId = 0;
    const updateAskModalDockStyle = (): void => {
      const askModalHeader = document.querySelector<HTMLElement>(
        '[data-testid=\'kangur-ai-tutor-header\']'
      );
      const askModalSurface = document.querySelector<HTMLElement>(
        '[data-testid=\'kangur-ai-tutor-ask-modal-surface\']'
      );
      const anchorRect = askModalHeader?.getBoundingClientRect() ?? askModalSurface?.getBoundingClientRect();
      if (!anchorRect) {
        setAskModalDockStyle(null);
        return;
      }

      if (anchorRect.width <= 0 || anchorRect.height <= 0) {
        setAskModalDockStyle(null);
        return;
      }

      const nextStyle: TutorMotionPosition = {
        left: anchorRect.left + anchorRect.width / 2 - AVATAR_SIZE / 2,
        top: Math.max(EDGE_GAP + 8, anchorRect.top - AVATAR_SIZE * 0.42),
      };

      setAskModalDockStyle((current) =>
        current?.left === nextStyle.left && current?.top === nextStyle.top ? current : nextStyle
      );
    };

    const scheduleUpdate = (): void => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateAskModalDockStyle);
    };

    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
    };
  }, [askModalVisible, isOpen, isTutorHidden]);

  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && askModalVisible) {
      setAskModalVisible(false);
    }
  }, [askModalVisible, isOpen]);

  useEffect(
    () => () => {
      if (selectionExplainTimeoutRef.current !== null) {
        window.clearTimeout(selectionExplainTimeoutRef.current);
        selectionExplainTimeoutRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    if (!askModalVisible || !isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 80);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [askModalVisible, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: getMotionSafeScrollBehavior('smooth'),
    });
    if (!isOpen && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant') {
      setHasNewMessage(true);
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (!allowSelectedTextSupport) {
      setHighlightedText(null);
      return;
    }

    if (selectedText) {
      setHighlightedText(selectedText);
      return;
    }

    if (!isOpen) {
      setHighlightedText(null);
    }
  }, [allowSelectedTextSupport, isOpen, selectedText, setHighlightedText]);

  useEffect(() => {
    if (!dismissedSelectedText) {
      return;
    }

    if (selectedText?.trim()) {
      setDismissedSelectedText(null);
      return;
    }

    if (!rawSelectedText || rawSelectedText !== dismissedSelectedText) {
      setDismissedSelectedText(null);
    }
  }, [dismissedSelectedText, rawSelectedText, selectedText]);

  useEffect(() => {
    if (!isOpen) {
      setDismissedSelectedText(null);
      setPersistedSelectionRect(null);
      setPersistedSelectionPageRect(null);
      setPersistedSelectionContainerRect(null);
      setContextSwitchNotice(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!tutorSessionKey) {
      return;
    }

    const previousSessionKey = allowCrossPagePersistence ? previousSessionKeyRef.current : null;
    if (previousSessionKey && previousSessionKey !== tutorSessionKey) {
      setInputValue('');
      setPersistedSelectionRect(null);
      setPersistedSelectionPageRect(null);
      setPersistedSelectionContainerRect(null);
      setContextSwitchNotice(
        isOpen
          ? getContextSwitchNotice({
            surface: sessionContext?.surface,
            title: sessionContext?.title ?? null,
            contentId: sessionContext?.contentId ?? null,
            questionProgressLabel: sessionContext?.questionProgressLabel ?? null,
            questionId: sessionContext?.questionId ?? null,
            assignmentSummary: sessionContext?.assignmentSummary ?? null,
            assignmentId: sessionContext?.assignmentId ?? null,
          })
          : null
      );
    }

    previousSessionKeyRef.current = tutorSessionKey;
    if (allowCrossPagePersistence) {
      persistTutorSessionKey(tutorSessionKey);
    } else {
      clearPersistedTutorSessionKey();
    }
  }, [
    allowCrossPagePersistence,
    isOpen,
    sessionContext?.assignmentSummary,
    sessionContext?.assignmentId,
    sessionContext?.questionProgressLabel,
    sessionContext?.questionId,
    sessionContext?.contentId,
    sessionContext?.surface,
    sessionContext?.title,
    tutorSessionKey,
  ]);

  useEffect(() => {
    if (allowCrossPagePersistence) {
      return;
    }

    clearPersistedTutorSessionKey();
    previousSessionKeyRef.current = tutorSessionKey;
  }, [allowCrossPagePersistence, tutorSessionKey]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const pendingFollowUp = loadPersistedPendingTutorFollowUp();
    if (!pendingFollowUp) {
      return;
    }

    const createdAtMs = Date.parse(pendingFollowUp.createdAt);
    if (
      Number.isNaN(createdAtMs) ||
      Date.now() - createdAtMs > FOLLOW_UP_COMPLETION_MAX_AGE_MS
    ) {
      clearPersistedPendingTutorFollowUp();
      return;
    }

    const currentLocation = getCurrentTutorLocation();
    if (
      currentLocation?.pathname !== pendingFollowUp.pathname ||
      currentLocation?.search !== pendingFollowUp.search
    ) {
      return;
    }

    if (
      pendingFollowUp.sourcePathname === pendingFollowUp.pathname &&
      pendingFollowUp.sourceSearch === pendingFollowUp.search
    ) {
      clearPersistedPendingTutorFollowUp();
      return;
    }

    trackKangurClientEvent('kangur_ai_tutor_follow_up_completed', {
      surface: pendingFollowUp.sourceSurface,
      contentId: pendingFollowUp.sourceContentId,
      title: pendingFollowUp.sourceTitle,
      actionId: pendingFollowUp.actionId,
      actionPage: pendingFollowUp.actionPage,
      messageIndex: pendingFollowUp.messageIndex,
      hasQuery: pendingFollowUp.hasQuery,
      targetPath: pendingFollowUp.pathname,
      targetSearch: pendingFollowUp.search || null,
      pageKey: routing?.pageKey ?? null,
      currentSurface: sessionContext?.surface ?? null,
      currentContentId: sessionContext?.contentId ?? null,
    });
    recordFollowUpCompletion?.({
      actionId: pendingFollowUp.actionId,
      actionLabel: pendingFollowUp.actionLabel,
      actionReason: pendingFollowUp.actionReason,
      actionPage: pendingFollowUp.actionPage,
      targetPath: pendingFollowUp.pathname,
      targetSearch: pendingFollowUp.search,
    });
    clearPersistedPendingTutorFollowUp();
  }, [
    mounted,
    recordFollowUpCompletion,
    routing?.pageKey,
    routing?.requestedPath,
    sessionContext?.contentId,
    sessionContext?.surface,
    sessionContext?.title,
  ]);

  useEffect(() => {
    if (!contextSwitchNotice || !isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setContextSwitchNotice(null);
    }, 4_000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [contextSwitchNotice, isOpen]);

  const anchorKinds = useMemo(
    () =>
      getAnchorKindsForSurface(
        sessionContext?.surface,
        sessionContext?.contentId ?? null,
        sessionContext?.answerRevealed,
        hasCurrentQuestion,
        hasAssignmentSummary
      ),
    [
      hasAssignmentSummary,
      hasCurrentQuestion,
      sessionContext?.answerRevealed,
      sessionContext?.contentId,
      sessionContext?.surface,
    ]
  );
  const anchorKindsKey = anchorKinds.join(':');

  const registeredAnchor = useMemo(() => {
    if (!isOpen || !tutorAnchorContext) {
      return null;
    }

    return selectBestTutorAnchor({
      anchors: tutorAnchorContext.anchors,
      surface: sessionContext?.surface,
      contentId: sessionContext?.contentId ?? null,
      kinds: anchorKinds,
    });
  }, [
    anchorKinds,
    anchorKindsKey,
    isOpen,
    sessionContext?.contentId,
    sessionContext?.surface,
    tutorAnchorContext,
    viewportTick,
  ]);

  const homeOnboardingSteps = useMemo(() => {
    if (
      !tutorAnchorContext ||
      sessionContext?.surface !== 'game' ||
      sessionContext?.contentId !== HOME_ONBOARDING_ELIGIBLE_CONTENT_ID
    ) {
      return [];
    }

    return HOME_ONBOARDING_STEP_DEFINITIONS.filter((step) =>
      Boolean(
        selectBestTutorAnchor({
          anchors: tutorAnchorContext.anchors,
          surface: 'game',
          contentId: HOME_ONBOARDING_ELIGIBLE_CONTENT_ID,
          kinds: [step.kind],
        })
      )
    );
  }, [sessionContext?.contentId, sessionContext?.surface, tutorAnchorContext]);
  const homeOnboardingStep =
    homeOnboardingStepIndex !== null ? (homeOnboardingSteps[homeOnboardingStepIndex] ?? null) : null;
  const canStartHomeOnboardingManually = Boolean(
    mounted &&
      authState?.isAuthenticated &&
      enabled &&
      !askModalVisible &&
      sessionContext?.surface === 'game' &&
      sessionContext?.contentId === HOME_ONBOARDING_ELIGIBLE_CONTENT_ID &&
      homeOnboardingSteps.length > 0 &&
      homeOnboardingStepIndex === null &&
      !guidedTutorTarget
  );
  const homeOnboardingReplayLabel =
    homeOnboardingRecord?.status === 'completed' || homeOnboardingRecord?.status === 'dismissed'
      ? 'Powtorz plan strony'
      : 'Pokaz plan strony';

  useEffect(() => {
    if (homeOnboardingStepIndex === null) {
      return;
    }

    if (homeOnboardingSteps.length === 0) {
      setHomeOnboardingStepIndex(null);
      return;
    }

    if (homeOnboardingStepIndex >= homeOnboardingSteps.length) {
      setHomeOnboardingStepIndex(homeOnboardingSteps.length - 1);
    }
  }, [homeOnboardingStepIndex, homeOnboardingSteps]);

  const isEligibleForHomeOnboarding = Boolean(
    mounted &&
      authState?.isAuthenticated &&
      enabled &&
      !isTutorHidden &&
      !askModalVisible &&
      sessionContext?.surface === 'game' &&
      sessionContext?.contentId === HOME_ONBOARDING_ELIGIBLE_CONTENT_ID &&
      homeOnboardingSteps.length > 0
  );

  useEffect(() => {
    if (!isEligibleForHomeOnboarding) {
      homeOnboardingShownForCurrentEntryRef.current = false;
      if (sessionContext?.contentId !== HOME_ONBOARDING_ELIGIBLE_CONTENT_ID) {
        setHomeOnboardingStepIndex(null);
      }
      return;
    }

    if (homeOnboardingStepIndex !== null || guidedTutorTarget) {
      return;
    }

    if (homeOnboardingMode === 'off') {
      return;
    }

    if (
      !shouldRepeatHomeOnboardingOnEntry &&
      (homeOnboardingRecord?.status === 'completed' ||
        homeOnboardingRecord?.status === 'dismissed')
    ) {
      return;
    }

    if (homeOnboardingShownForCurrentEntryRef.current) {
      return;
    }

    homeOnboardingShownForCurrentEntryRef.current = true;
    const nextRecord = persistHomeOnboardingRecord('shown');
    setHomeOnboardingRecord(nextRecord);
    setHomeOnboardingStepIndex(0);
    trackKangurClientEvent('kangur_ai_tutor_home_onboarding_shown', {
      stepCount: homeOnboardingSteps.length,
    });
  }, [
    enabled,
    guidedTutorTarget,
    homeOnboardingMode,
    homeOnboardingRecord?.status,
    homeOnboardingStepIndex,
    homeOnboardingSteps.length,
    isEligibleForHomeOnboarding,
    sessionContext?.contentId,
    shouldRepeatHomeOnboardingOnEntry,
  ]);

  const guidedTargetAnchor = useMemo(() => {
    if (!isAuthGuidedTutorTarget(guidedTutorTarget) || !tutorAnchorContext) {
      return null;
    }

    return selectBestTutorAnchor({
      anchors: tutorAnchorContext.anchors,
      surface: 'auth',
      kinds: [guidedTutorTarget.kind],
    });
  }, [guidedTutorTarget, tutorAnchorContext, viewportTick]);
  const homeOnboardingAnchor = useMemo(() => {
    if (!homeOnboardingStep || !tutorAnchorContext) {
      return null;
    }

    return selectBestTutorAnchor({
      anchors: tutorAnchorContext.anchors,
      surface: 'game',
      contentId: HOME_ONBOARDING_ELIGIBLE_CONTENT_ID,
      kinds: [homeOnboardingStep.kind],
    });
  }, [homeOnboardingStep, tutorAnchorContext, viewportTick]);
  const guidedFallbackRect = useMemo(() => {
    if (!isAuthGuidedTutorTarget(guidedTutorTarget) || guidedTargetAnchor || typeof document === 'undefined') {
      return null;
    }

    const fallbackAnchor = document.querySelector<HTMLElement>(
      `[data-kangur-tutor-anchor-surface="auth"][data-kangur-tutor-anchor-kind="${guidedTutorTarget.kind}"]`
    );
    if (!fallbackAnchor) {
      return null;
    }

    const rect = fallbackAnchor.getBoundingClientRect();
    return rect.width >= 0 && rect.height >= 0 ? rect : null;
  }, [guidedTargetAnchor, guidedTutorTarget, viewportTick]);
  const guidedSelectionRect = useMemo(() => {
    if (!isSelectionGuidedTutorTarget(guidedTutorTarget)) {
      return null;
    }

    return cloneRect(
      getViewportRectFromPageRect(activeSelectionPageRect ?? persistedSelectionPageRect) ??
        persistedSelectionRect ??
        activeSelectionRect
    );
  }, [
    activeSelectionPageRect,
    activeSelectionRect,
    guidedTutorTarget,
    persistedSelectionPageRect,
    persistedSelectionRect,
  ]);
  const guidedMode = homeOnboardingStep
    ? 'home_onboarding'
    : isSelectionGuidedTutorTarget(guidedTutorTarget)
      ? 'selection'
      : isAuthGuidedTutorTarget(guidedTutorTarget)
        ? 'auth'
        : null;
  const guidedTargetLabel =
    guidedTargetAnchor?.metadata?.label?.trim() ||
    (isAuthGuidedTutorTarget(guidedTutorTarget)
      ? guidedTutorTarget.authMode === 'create-account'
        ? 'Utwórz konto'
        : 'Zaloguj się'
      : null);
  const guidedCalloutTitle =
    guidedMode === 'home_onboarding'
      ? (homeOnboardingStep?.title ?? '')
      : guidedMode === 'selection'
        ? 'Wyjaśniam ten fragment.'
        : isAuthGuidedTutorTarget(guidedTutorTarget) && guidedTutorTarget.kind === 'login_identifier_field'
          ? guidedTutorTarget.authMode === 'create-account'
            ? 'Tutaj wpisz e-mail rodzica.'
            : 'Tutaj wpisz e-mail rodzica albo nick ucznia.'
          : isAuthGuidedTutorTarget(guidedTutorTarget) && guidedTutorTarget.kind === 'login_form'
            ? guidedTutorTarget.authMode === 'create-account'
              ? 'Tutaj założysz konto rodzica.'
              : 'Tutaj wpiszesz dane do logowania.'
            : guidedTargetLabel
              ? `U góry kliknij „${guidedTargetLabel}”.`
              : null;
  const guidedCalloutDetail =
    guidedMode === 'home_onboarding'
      ? (homeOnboardingStep?.description ?? '')
      : guidedMode === 'selection'
        ? 'Za chwilę otworzę wyjaśnienie dokładnie dla zaznaczonego tekstu.'
        : isAuthGuidedTutorTarget(guidedTutorTarget) && guidedTutorTarget.kind === 'login_identifier_field'
          ? guidedTutorTarget.authMode === 'create-account'
            ? 'Zacznij od adresu e-mail rodzica w tym polu. Hasło ustawisz zaraz pod nim.'
            : 'Zacznij od loginu w tym polu, a potem wpisz hasło poniżej.'
          : isAuthGuidedTutorTarget(guidedTutorTarget) && guidedTutorTarget.kind === 'login_form'
            ? guidedTutorTarget.authMode === 'create-account'
              ? 'Wpisz e-mail rodzica i ustaw hasło. Po potwierdzeniu e-maila wrócisz tu tym samym loginem.'
              : 'Wpisz e-mail rodzica albo nick ucznia, potem hasło.'
            : isAuthGuidedTutorTarget(guidedTutorTarget) && guidedTutorTarget.authMode === 'create-account'
              ? 'Ten przycisk otworzy zakładanie konta rodzica. Najpierw wybierz go w nawigacji, a formularz pojawi się potem.'
              : isAuthGuidedTutorTarget(guidedTutorTarget)
                ? 'Ten przycisk otworzy logowanie. Najpierw kliknij go w nawigacji, a dopiero potem wpiszesz dane.'
                : null;
  const guidedCalloutStepLabel =
    guidedMode === 'home_onboarding' && homeOnboardingStepIndex !== null && homeOnboardingSteps.length > 0
      ? `Krok ${homeOnboardingStepIndex + 1} z ${homeOnboardingSteps.length}`
      : null;
  const guidedSelectionPreview =
    guidedMode === 'selection' && isSelectionGuidedTutorTarget(guidedTutorTarget)
      ? guidedTutorTarget.selectedText.slice(0, 120)
      : null;

  useEffect(() => {
    if (!homeOnboardingAnchor || typeof document === 'undefined') {
      return;
    }

    const anchorElement = document.querySelector<HTMLElement>(
      `[data-kangur-tutor-anchor-id="${homeOnboardingAnchor.id}"]`
    );
    if (!anchorElement) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      anchorElement.scrollIntoView({
        behavior: getMotionSafeScrollBehavior('smooth'),
        block: 'center',
        inline: 'nearest',
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [homeOnboardingAnchor?.id]);

  useEffect(() => {
    if (!isAuthGuidedTutorTarget(guidedTutorTarget)) {
      return;
    }

    const expectedAuthMode = guidedTutorTarget.authMode;
    const canGuideIntoForm =
      loginModal.isOpen &&
      loginModal.authMode === expectedAuthMode &&
      guidedTutorTarget.kind !== getGuidedGuestModalTargetKind();
    if (canGuideIntoForm) {
      setGuidedTutorTarget((current) => {
        if (!isAuthGuidedTutorTarget(current) || current.authMode !== expectedAuthMode) {
          return current;
        }
        if (current.kind === getGuidedGuestModalTargetKind()) {
          return current;
        }
        return {
          ...current,
          kind: getGuidedGuestModalTargetKind(),
        };
      });
      return;
    }

    const shouldGuideBackToNav =
      !loginModal.isOpen &&
      (guidedTutorTarget.kind === 'login_form' ||
        guidedTutorTarget.kind === getGuidedGuestModalTargetKind());
    if (shouldGuideBackToNav) {
      setGuidedTutorTarget((current) => {
        if (!isAuthGuidedTutorTarget(current)) {
          return current;
        }
        if (
          current?.kind !== 'login_form' &&
          current?.kind !== getGuidedGuestModalTargetKind()
        ) {
          return current;
        }
        return {
          ...current,
          kind: getGuidedGuestTargetKind(current.authMode),
        };
      });
    }
  }, [guidedTutorTarget, loginModal.authMode, loginModal.isOpen]);

  const activeFocus = useMemo<ActiveTutorFocus>(() => {
    if (activeSelectionRect) {
      return {
        rect: activeSelectionRect,
        kind: 'selection',
        id: 'selection',
        label: activeSelectedText,
        assignmentId: null,
      };
    }

    if (registeredAnchor) {
      return {
        rect: registeredAnchor.getRect(),
        kind: registeredAnchor.kind,
        id: registeredAnchor.id,
        label: registeredAnchor.metadata?.label ?? null,
        assignmentId: registeredAnchor.metadata?.assignmentId ?? null,
      };
    }

    return {
      rect: null,
      kind: null,
      id: null,
      label: null,
      assignmentId: null,
    };
  }, [activeSelectedText, activeSelectionRect, registeredAnchor, viewportTick]);

  const focusChipLabel = getFocusChipLabel(activeFocus, activeSelectedText, sessionContext?.surface);
  const selectionActionLayout = selectionRect
    ? getSelectionActionLayout(selectionRect, viewport)
    : null;
  const selectionActionStyle = selectionActionLayout?.style ?? null;
  const shouldRenderSelectionAction =
    !isTutorHidden &&
    allowSelectedTextSupport &&
    !isOpen &&
    homeOnboardingStepIndex === null &&
    !guidedTutorTarget &&
    Boolean(selectedText && selectionRect && selectionActionStyle) &&
    !isSelectionWithinTutorUi();
  const isStaticUiMode = uiMode === 'static';
  const displayFocusRect = isAnchoredUiMode ? activeFocus.rect : null;
  const isMobileSheet = viewport.width < motionProfile.sheetBreakpoint;
  const lastAssistantCoachingMode = getLastAssistantCoachingMode(messages);
  const quickActions = buildQuickActions({
    surface: sessionContext?.surface,
    answerRevealed: sessionContext?.answerRevealed,
    hasSelectedText: Boolean(activeSelectedText),
    hasMessages: messages.length > 0,
    hasCurrentQuestion,
    hasAssignmentSummary,
    focusKind: activeFocus.kind,
    isLoading,
    lastAssistantCoachingMode,
    learnerMemory,
    title: sessionContext?.title,
  });
  const bridgeQuickAction = pickQuickAction(quickActions, ['bridge-to-game', 'bridge-to-lesson']);
  const bridgeSummaryChipLabel = getBridgeSummaryChipLabel(bridgeQuickAction);
  const proactiveNudge = buildProactiveNudge({
    proactiveNudges,
    hintDepth,
    surface: sessionContext?.surface,
    answerRevealed: sessionContext?.answerRevealed,
    hasSelectedText: Boolean(activeSelectedText),
    hasCurrentQuestion,
    hasAssignmentSummary,
    quickActions,
    hasMessages: messages.length > 0,
    canSendMessages,
  });
  const estimatedBubbleHeight = isMobileSheet
    ? undefined
    : Math.max(
      panelMeasuredHeight ?? 0,
      getEstimatedBubbleHeight(
        viewport,
        (proactiveNudge ? 108 : 0) + (quickActions.length > 2 ? 24 : 0)
      )
    );
  const bubblePlacement = getBubblePlacement(
    isOpen && !isMobileSheet ? displayFocusRect : null,
    viewport,
    isMobileSheet ? 'sheet' : 'bubble',
    {
      desktop: motionProfile.desktopBubbleWidth,
      mobile: motionProfile.mobileBubbleWidth,
    },
    {
      estimatedHeight: estimatedBubbleHeight,
      protectedRects: activeSelectionProtectedRect ? [activeSelectionProtectedRect] : [],
    }
  );
  const guidedFocusRect =
    guidedMode === 'home_onboarding'
      ? homeOnboardingAnchor?.getRect() ?? null
      : guidedMode === 'selection'
        ? guidedSelectionRect
        : guidedTargetAnchor?.getRect() ?? guidedFallbackRect;
  const guidedAvatarStyle = guidedFocusRect ? getAnchorAvatarStyle(guidedFocusRect) : null;
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
    () => formatGuidedArrowheadTransition(motionProfile, Boolean(prefersReducedMotion)),
    [motionProfile, prefersReducedMotion]
  );
  const guidedAvatarArrowheadDisplayAngle =
    guidedAvatarArrowheadRenderAngle ?? guidedAvatarArrowhead?.angle ?? null;
  const guidedAvatarArrowheadDisplayAngleLabel =
    guidedAvatarArrowheadDisplayAngle !== null
      ? guidedAvatarArrowheadDisplayAngle.toFixed(2)
      : undefined;
  const guidedCalloutLayout = guidedFocusRect ? getGuidedCalloutLayout(guidedFocusRect, viewport) : null;
  const guidedCalloutStyle = guidedCalloutLayout?.style ?? null;
  const selectionSpotlightStyle =
    guidedMode === 'selection' && guidedFocusRect ? getSelectionSpotlightStyle(guidedFocusRect) : null;
  const isGuidedTutorMode = !isTutorHidden && guidedMode !== null;
  const isAskModalMode = !isTutorHidden && askModalVisible && isOpen;
  const shouldEnableTutorNarration = isOpen && !isGuidedTutorMode && !shouldRenderGuestIntroUi;
  const emptyStateMessage = getEmptyStateMessage({
    surface: sessionContext?.surface,
    answerRevealed: sessionContext?.answerRevealed,
    hasCurrentQuestion,
    hasAssignmentSummary,
    hasSelectedText: Boolean(activeSelectedText),
    bridgeQuickAction,
  });
  const askModalHelperText =
    askEntrySource === 'guided_help'
      ? 'Możesz zapytać o logowanie, konto rodzica albo kolejny krok na stronie.'
      : 'Możesz zapytać o logowanie, konto rodzica albo korzystanie ze strony.';
  const tutorNarrationScriptId = useMemo(() => {
    const base = [
      'kangur-ai-tutor',
      sessionContext?.surface ?? 'general',
      sessionContext?.contentId ?? 'root',
      isAskModalMode ? 'ask-modal' : 'chat',
    ]
      .join('-')
      .replace(/[^a-zA-Z0-9:_-]+/g, '-');

    return base.slice(0, 120);
  }, [isAskModalMode, sessionContext?.contentId, sessionContext?.surface]);
  const tutorNarrationFallbackText = useMemo(() => {
    const parts: string[] = [];
    const pushPart = (value: string | null | undefined): void => {
      if (typeof value !== 'string') {
        return;
      }

      const trimmed = value.trim();
      if (trimmed.length > 0) {
        parts.push(trimmed);
      }
    };

    if (isAskModalMode) {
      pushPart(askModalHelperText);
    }

    if (contextSwitchNotice) {
      pushPart(contextSwitchNotice.title);
      pushPart(contextSwitchNotice.target);
      pushPart(contextSwitchNotice.detail);
    }

    pushPart(focusChipLabel);
    if (activeFocus.kind !== 'selection') {
      pushPart(activeFocus.label);
    }

    if (activeSelectedText) {
      pushPart('Wyjaśniany fragment');
      pushPart(activeSelectedText);
      pushPart('Możesz wrócić do zwykłej rozmowy albo ponownie pokazać fragment na stronie.');
    }

    if (proactiveNudge) {
      pushPart(proactiveNudge.title);
      pushPart(proactiveNudge.description);
    }

    if (messages.length === 0) {
      pushPart(isAskModalMode ? askModalHelperText : emptyStateMessage);
    } else {
      messages.forEach((message) => {
        if (message.role === 'user') {
          pushPart(message.content);
          return;
        }

        if (message.coachingFrame) {
          pushPart(message.coachingFrame.label);
          pushPart(message.coachingFrame.description);
          pushPart(message.coachingFrame.rationale);
        }

        pushPart(message.content);
        message.followUpActions?.forEach((action) => {
          pushPart(action.reason);
        });

        if (showSources) {
          message.sources?.slice(0, 3).forEach((source) => {
            pushPart(source.metadata?.title?.trim() || `[doc:${source.documentId}]`);
            pushPart(source.text?.trim());
          });
        }
      });
    }

    return parts.join('\n\n');
  }, [
    activeFocus.kind,
    activeFocus.label,
    activeSelectedText,
    askModalHelperText,
    contextSwitchNotice,
    emptyStateMessage,
    focusChipLabel,
    isAskModalMode,
    messages,
    proactiveNudge,
    showSources,
  ]);
  const tutorNarrationText =
    tutorNarrationObservedText.trim().length > 0
      ? tutorNarrationObservedText
      : tutorNarrationFallbackText;
  const tutorNarrationScript = useMemo(
    () =>
      buildKangurLessonNarrationScriptFromText({
        lessonId: tutorNarrationScriptId,
        title: isAskModalMode ? `${tutorName} - pomoc` : `${tutorName} - rozmowa`,
        description: sessionContext?.title ?? null,
        text: tutorNarrationText,
        locale: 'pl-PL',
      }),
    [
      isAskModalMode,
      sessionContext?.title,
      tutorName,
      tutorNarrationText,
      tutorNarrationScriptId,
    ]
  );
  const canNarrateTutorText = tutorNarrationText.trim().length > 0;
  const selectionContextSpotlightStyle =
    !isGuidedTutorMode && !isAskModalMode && isOpen && activeSelectionRect
      ? getSelectionSpotlightStyle(activeSelectionRect)
      : null;
  const showAttachedAvatarShell =
    !isTutorHidden && isOpen && isAnchoredUiMode && !isGuidedTutorMode && !isAskModalMode;
  const hideFloatingAvatar = isOpen && isStaticUiMode && !isAskModalMode;
  const showFloatingAvatar =
    !isTutorHidden &&
    (isAskModalMode || isGuidedTutorMode || (!showAttachedAvatarShell && !hideFloatingAvatar));
  const avatarAttachmentSide = getAttachedAvatarSide({
    rect: displayFocusRect,
    mode: bubblePlacement.mode,
    panelLeft:
      typeof bubblePlacement.style.left === 'number' ? bubblePlacement.style.left : undefined,
    panelWidth: bubblePlacement.width,
    strategy: bubblePlacement.strategy,
  });
  const attachedAvatarStyle = getAttachedAvatarStyle(avatarAttachmentSide);
  const avatarPointer =
    bubblePlacement.mode === 'bubble' &&
    isAnchoredUiMode &&
    displayFocusRect &&
    typeof bubblePlacement.style.left === 'number' &&
    typeof bubblePlacement.style.top === 'number'
      ? getTutorPointerGeometry({
        focusRect: displayFocusRect,
        panelLeft: bubblePlacement.style.left,
        panelTop: bubblePlacement.style.top,
        panelWidth: bubblePlacement.width ?? motionProfile.desktopBubbleWidth,
        side: avatarAttachmentSide,
      })
      : null;
  const attachedLaunchOffset =
    bubblePlacement.mode === 'bubble' &&
    typeof bubblePlacement.style.left === 'number' &&
    typeof bubblePlacement.style.top === 'number'
      ? getDockLaunchOffset({
        finalLeft: bubblePlacement.style.left,
        finalTop: bubblePlacement.style.top,
        width: bubblePlacement.width ?? motionProfile.desktopBubbleWidth,
        side: avatarAttachmentSide,
        viewport,
      })
      : { x: 0, y: 0 };
  const baseAvatarStyle =
    isAskModalMode && askModalDockStyle
      ? askModalDockStyle
      : showAttachedAvatarShell || (isOpen && bubblePlacement.mode === 'sheet')
        ? getDockAvatarStyle()
        : isOpen && displayFocusRect
          ? getAnchorAvatarStyle(displayFocusRect)
          : getDockAvatarStyle();
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
    guidedMode === 'home_onboarding' && homeOnboardingStep && guidedFocusRect
      ? homeOnboardingStep.kind
      : guidedTutorTarget && guidedFocusRect
        ? guidedTutorTarget.kind
        : isOpen && isAnchoredUiMode
          ? activeFocus.kind ?? 'dock'
          : 'dock';
  const pointerMarkerId = `kangur-ai-tutor-pointer-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const panelAvatarPlacement = showAttachedAvatarShell
    ? 'attached'
    : hideFloatingAvatar
      ? 'hidden'
      : 'independent';
  const floatingAvatarPlacement = isAskModalMode
    ? 'ask-modal'
    : isGuidedTutorMode && guidedFocusRect
      ? 'guided'
      : 'floating';
  const panelOpenAnimation =
    bubblePlacement.mode === 'sheet'
      ? 'sheet'
      : isStaticUiMode
        ? 'fade'
        : 'dock-launch';
  const panelTransition = prefersReducedMotion
    ? reducedMotionTransitions.instant
    : panelOpenAnimation === 'fade'
      ? { duration: 0.2, ease: 'easeOut' as const }
      : motionProfile.bubbleTransition;
  const focusTelemetryKey = useMemo(
    () => (isOpen ? getFocusTelemetryKey(tutorSessionKey, activeFocus) : null),
    [activeFocus, isOpen, tutorSessionKey]
  );
  const selectedTextPreview = activeSelectedText?.slice(0, 140) ?? null;
  const proactiveNudgeTelemetryKey = useMemo(
    () => {
      if (!isOpen || !proactiveNudge) {
        return null;
      }

      const contextKey =
        tutorSessionKey ??
        [
          sessionContext?.surface ?? 'unknown',
          sessionContext?.contentId ?? sessionContext?.title ?? 'none',
          activeFocus.id ?? activeFocus.kind ?? 'focus',
        ].join(':');

      return `${contextKey}:${proactiveNudge.mode}:${proactiveNudge.action.id}`;
    },
    [
      activeFocus.id,
      activeFocus.kind,
      isOpen,
      proactiveNudge,
      sessionContext?.contentId,
      sessionContext?.surface,
      sessionContext?.title,
      tutorSessionKey,
    ]
  );
  const quotaExhaustedTelemetryKey = useMemo(
    () =>
      usageSummary &&
      usageSummary.dailyMessageLimit !== null &&
      usageSummary.remainingMessages === 0
        ? `${usageSummary.dateKey}:${usageSummary.messageCount}:${usageSummary.dailyMessageLimit}`
        : null,
    [usageSummary]
  );
  useLayoutEffect(() => {
    if (!proactiveNudgeTelemetryKey || !proactiveNudge) {
      lastTrackedProactiveNudgeKeyRef.current = proactiveNudgeTelemetryKey;
      return;
    }

    if (lastTrackedProactiveNudgeKeyRef.current === proactiveNudgeTelemetryKey) {
      return;
    }

    lastTrackedProactiveNudgeKeyRef.current = proactiveNudgeTelemetryKey;
    trackKangurClientEvent('kangur_ai_tutor_proactive_nudge_shown', {
      surface: sessionContext?.surface ?? null,
      contentId: sessionContext?.contentId ?? null,
      title: sessionContext?.title ?? null,
      nudgeMode: proactiveNudges,
      actionId: proactiveNudge.action.id,
      bridgeActionId: bridgeQuickAction?.id ?? null,
      isBridgeAction: proactiveNudge.action.id === bridgeQuickAction?.id,
      hintDepth,
      hasSelectedText: Boolean(activeSelectedText),
    });
  }, [
    activeSelectedText,
    bridgeQuickAction,
    hintDepth,
    proactiveNudge,
    proactiveNudgeTelemetryKey,
    proactiveNudges,
    sessionContext?.contentId,
    sessionContext?.surface,
    sessionContext?.title,
  ]);
  useEffect(() => {
    if (!quotaExhaustedTelemetryKey || !usageSummary) {
      lastTrackedQuotaKeyRef.current = quotaExhaustedTelemetryKey;
      return;
    }

    if (lastTrackedQuotaKeyRef.current === quotaExhaustedTelemetryKey) {
      return;
    }

    lastTrackedQuotaKeyRef.current = quotaExhaustedTelemetryKey;
    trackKangurClientEvent('kangur_ai_tutor_quota_exhausted', {
      ...telemetryContext,
      dateKey: usageSummary.dateKey,
      messageCount: usageSummary.messageCount,
      dailyMessageLimit: usageSummary.dailyMessageLimit,
      remainingMessages: usageSummary.remainingMessages,
    });
  }, [quotaExhaustedTelemetryKey, telemetryContext, usageSummary]);
  const inputPlaceholder = getInputPlaceholder({
    canSendMessages,
    surface: sessionContext?.surface,
    answerRevealed: sessionContext?.answerRevealed,
    hasCurrentQuestion,
    hasAssignmentSummary,
    hasSelectedText: Boolean(activeSelectedText),
    bridgeQuickAction,
  });
  useLayoutEffect(() => {
    if (!shouldEnableTutorNarration) {
      setTutorNarrationObservedText('');
      return;
    }

    const root = tutorNarrationRootRef.current;
    if (!root) {
      setTutorNarrationObservedText('');
      return;
    }

    let timeoutId: number | null = null;
    const updateText = (): void => {
      setTutorNarrationObservedText(extractNarrationTextFromElement(root));
    };

    updateText();

    if (typeof MutationObserver === 'undefined') {
      return;
    }

    const observer = new MutationObserver(() => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(updateText, 120);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [
    askModalHelperText,
    sessionContext?.contentId,
    sessionContext?.surface,
    shouldEnableTutorNarration,
  ]);
  const avatarButtonClassName = cn(
    'flex h-14 w-14 cursor-pointer items-center justify-center rounded-full',
    'border-2 border-amber-900 bg-gradient-to-br from-amber-300 via-orange-400 to-orange-500',
    'shadow-[0_14px_28px_-16px_rgba(154,82,24,0.26)] hover:brightness-[1.03]',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2'
  );
  const avatarButtonStyle: CSSProperties = {
    borderColor: FLOATING_TUTOR_AVATAR_RIM_COLOR,
  };

  useEffect(() => {
    if (!isOpen || !focusTelemetryKey || !activeFocus.kind) {
      lastTrackedFocusKeyRef.current = focusTelemetryKey;
      setPanelMotionState('settled');
      if (motionTimeoutRef.current !== null) {
        window.clearTimeout(motionTimeoutRef.current);
        motionTimeoutRef.current = null;
      }
      return;
    }

    if (lastTrackedFocusKeyRef.current === focusTelemetryKey) {
      return;
    }

    lastTrackedFocusKeyRef.current = focusTelemetryKey;
    setPanelMotionState('animating');
    trackKangurClientEvent('kangur_ai_tutor_anchor_changed', {
      surface: sessionContext?.surface ?? null,
      contentId: sessionContext?.contentId ?? null,
      title: sessionContext?.title ?? null,
      anchorKind: activeFocus.kind,
      anchorId: activeFocus.id,
      layoutMode: bubblePlacement.mode,
      hasSelectedText: Boolean(activeSelectedText),
    });

    if (motionTimeoutRef.current !== null) {
      window.clearTimeout(motionTimeoutRef.current);
    }
    motionTimeoutRef.current = window.setTimeout(() => {
      setPanelMotionState('settled');
      trackKangurClientEvent('kangur_ai_tutor_motion_completed', {
        surface: sessionContext?.surface ?? null,
        contentId: sessionContext?.contentId ?? null,
        title: sessionContext?.title ?? null,
        anchorKind: activeFocus.kind,
        anchorId: activeFocus.id,
        layoutMode: bubblePlacement.mode,
        hasSelectedText: Boolean(activeSelectedText),
      });
      motionTimeoutRef.current = null;
    }, prefersReducedMotion ? 0 : motionProfile.motionCompletedDelayMs);

    return () => {
      if (motionTimeoutRef.current !== null) {
        window.clearTimeout(motionTimeoutRef.current);
        motionTimeoutRef.current = null;
      }
    };
  }, [
    activeFocus.id,
    activeFocus.kind,
    activeSelectedText,
    bubblePlacement.mode,
    focusTelemetryKey,
    isOpen,
    motionProfile.motionCompletedDelayMs,
    prefersReducedMotion,
    sessionContext?.contentId,
    sessionContext?.surface,
    sessionContext?.title,
  ]);

  const persistSelectionContext = useCallback(
    (options?: { prefillInput?: boolean }): string | null => {
      if (!allowSelectedTextSupport) {
        return null;
      }

      const trimmedSelectedText = selectedText?.trim() || null;
      if (!trimmedSelectedText) {
        return null;
      }

      if (options?.prefillInput) {
        setInputValue(`"${trimmedSelectedText}"\n\n`);
      }

      setHighlightedText(trimmedSelectedText);
      persistSelectionGeometry();
      return trimmedSelectedText;
    },
    [
      allowSelectedTextSupport,
      persistSelectionGeometry,
      selectedText,
      setHighlightedText,
    ]
  );

  const handleOpenChat = useCallback(
    (reason: 'toggle' | 'selection' | 'selection_explain' | 'ask_modal'): void => {
      const capturedSelectedText = reason === 'toggle' ? persistSelectionContext() : null;
      const resolvedReason = reason === 'toggle' && capturedSelectedText ? 'selection' : reason;
      trackKangurClientEvent('kangur_ai_tutor_opened', {
        ...telemetryContext,
        reason: resolvedReason,
        hasSelectedText: Boolean(capturedSelectedText ?? activeSelectedText),
        messageCount: messages.length,
      });
      openChat();
    },
    [
      activeSelectedText,
      messages.length,
      openChat,
      persistSelectionContext,
      telemetryContext,
    ]
  );

  const handleOpenAskModal = useCallback(
    (source: TutorAskEntrySource): void => {
      avatarDragStateRef.current = null;
      suppressAvatarClickRef.current = false;
      setIsAvatarDragging(false);
      setAskModalDockStyle(null);
      askModalReturnStateRef.current = {
        wasOpen: isOpen,
        launcherPromptVisible,
        guestIntroVisible,
        guestIntroHelpVisible,
        guidedTutorTarget,
      };

      if (guestIntroVisible || guestIntroHelpVisible) {
        const nextRecord = persistGuestIntroRecord('accepted');
        setGuestIntroRecord(nextRecord);
      }
      if (selectionExplainTimeoutRef.current !== null) {
        window.clearTimeout(selectionExplainTimeoutRef.current);
        selectionExplainTimeoutRef.current = null;
      }

      setLauncherPromptVisible(false);
      setGuestIntroVisible(false);
      setGuestIntroHelpVisible(false);
      setGuidedTutorTarget(null);
      setAskEntrySource(source);
      setAskModalVisible(true);

      if (!isOpen) {
        handleOpenChat('ask_modal');
      }
    },
    [
      guestIntroHelpVisible,
      guestIntroVisible,
      guidedTutorTarget,
      handleOpenChat,
      isOpen,
      launcherPromptVisible,
    ]
  );

  const handleCloseChat = useCallback(
    (reason: 'toggle' | 'header' | 'outside'): void => {
      trackKangurClientEvent('kangur_ai_tutor_closed', {
        ...telemetryContext,
        reason,
        messageCount: messages.length,
      });
      if (reason === 'outside' && activeFocus.kind === 'selection') {
        clearSelection();
        setHighlightedText(null);
        setPersistedSelectionRect(null);
        setPersistedSelectionPageRect(null);
        setPersistedSelectionContainerRect(null);
      }
      closeChat();
    },
    [
      activeFocus.kind,
      clearSelection,
      closeChat,
      messages.length,
      setPersistedSelectionPageRect,
      setPersistedSelectionContainerRect,
      setHighlightedText,
      telemetryContext,
    ]
  );

  const handleCloseAskModal = useCallback(
    (reason: 'toggle' | 'header' | 'outside' = 'header'): void => {
      const returnState = askModalReturnStateRef.current;
      setAskModalVisible(false);
      askModalReturnStateRef.current = null;
      avatarDragStateRef.current = null;
      suppressAvatarClickRef.current = false;
      setIsAvatarDragging(false);
      setAskModalDockStyle(null);
      setHomeOnboardingStepIndex(null);
      setDraggedAvatarPoint(null);
      clearPersistedTutorAvatarPosition();
      setLauncherPromptVisible(returnState?.launcherPromptVisible ?? false);
      setGuestIntroVisible(returnState?.guestIntroVisible ?? false);
      setGuestIntroHelpVisible(returnState?.guestIntroHelpVisible ?? false);
      setGuidedTutorTarget(returnState?.guidedTutorTarget ?? null);

      if (!returnState?.wasOpen) {
        handleCloseChat(reason);
      }
    },
    [handleCloseChat]
  );

  const handleCloseLauncherPrompt = useCallback((): void => {
    setLauncherPromptVisible(false);
  }, []);

  const handleCloseGuestIntroCard = useCallback((): void => {
    setGuestIntroVisible(false);
    setGuestIntroHelpVisible(false);
  }, []);

  useEffect(() => {
    if (!isOpen || bubblePlacement.mode !== 'bubble') {
      return;
    }

    const handlePointerDown = (event: PointerEvent): void => {
      if (isTargetWithinTutorUi(event.target)) {
        return;
      }

      handleCloseChat('outside');
    };

    document.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [bubblePlacement.mode, handleCloseChat, isOpen]);

  const handleGuestIntroDismiss = useCallback((): void => {
    const nextRecord = persistGuestIntroRecord('dismissed');
    setGuestIntroRecord(nextRecord);
    setGuestIntroVisible(false);
    setGuestIntroHelpVisible(false);
    trackKangurClientEvent('kangur_ai_tutor_guest_intro_dismissed');
  }, []);

  const handleGuestIntroAccept = useCallback((): void => {
    const nextRecord = persistGuestIntroRecord('accepted');
    setGuestIntroRecord(nextRecord);
    setGuestIntroVisible(false);
    trackKangurClientEvent('kangur_ai_tutor_guest_intro_accepted', {
      hasInteractiveTutor: enabled,
    });

    if (enabled) {
      handleOpenChat('toggle');
      return;
    }

    setGuestIntroHelpVisible(true);
  }, [enabled, handleOpenChat]);

  const handleGuestIntroHelpClose = useCallback((): void => {
    setGuestIntroHelpVisible(false);
  }, []);

  const startGuidedGuestLogin = useCallback(
    (
      authMode: GuidedTutorAuthMode,
      source: 'guest_intro' | 'chat_message' = 'guest_intro'
    ): void => {
      trackKangurClientEvent('kangur_ai_tutor_guest_intro_login_clicked', {
        authMode,
        guidance: 'guided_navigation',
        source,
      });
      if (selectionExplainTimeoutRef.current !== null) {
        window.clearTimeout(selectionExplainTimeoutRef.current);
        selectionExplainTimeoutRef.current = null;
      }
      if (isOpen) {
        handleCloseChat('toggle');
      }
      setGuidedTutorTarget({
        mode: 'auth',
        authMode,
        kind: getGuidedGuestTargetKind(authMode),
      });
      setHasNewMessage(false);
      suppressAvatarClickRef.current = false;
    },
    [handleCloseChat, isOpen]
  );

  const handleGuestIntroLogin = useCallback((): void => {
    setGuestIntroHelpVisible(false);
    startGuidedGuestLogin('sign-in');
  }, [startGuidedGuestLogin]);

  const handleGuestIntroCreateAccount = useCallback((): void => {
    setGuestIntroHelpVisible(false);
    startGuidedGuestLogin('create-account');
  }, [startGuidedGuestLogin]);

  const focusSelectionPageRect = useCallback(
    (
      selectionPageRect: DOMRect | null | undefined,
      options?: {
        forceScroll?: boolean;
        spotlight?: boolean;
      }
    ): void => {
      if (!selectionPageRect) {
        return;
      }

      const viewportTop = window.scrollY;
      const viewportBottom = viewportTop + viewport.height;
      const topPadding = Math.min(Math.max(viewport.height * 0.24, 72), 180);
      const bottomPadding = Math.min(Math.max(viewport.height * 0.18, 56), 140);
      const needsScroll =
        options?.forceScroll === true ||
        selectionPageRect.top < viewportTop + topPadding ||
        selectionPageRect.bottom > viewportBottom - bottomPadding;

      if (needsScroll) {
        const targetTop = Math.max(0, selectionPageRect.top - topPadding);
        window.scrollTo({
          top: targetTop,
          behavior: getMotionSafeScrollBehavior('smooth'),
        });
      }

      if (options?.spotlight) {
        setSelectionContextSpotlightTick((current) => current + 1);
      }
    },
    [viewport.height]
  );

  const startGuidedSelectionExplanation = useCallback(
    (selectionText: string): void => {
      if (selectionExplainTimeoutRef.current !== null) {
        window.clearTimeout(selectionExplainTimeoutRef.current);
        selectionExplainTimeoutRef.current = null;
      }

      trackKangurClientEvent('kangur_ai_tutor_selection_guidance_started', {
        ...telemetryContext,
        selectionLength: selectionText.length,
      });
      focusSelectionPageRect(activeSelectionPageRect);
      setHasNewMessage(false);
      setGuidedTutorTarget({
        mode: 'selection',
        kind: 'selection_excerpt',
        selectedText: selectionText,
      });
      suppressAvatarClickRef.current = false;

      const guidanceDelayMs = prefersReducedMotion
        ? 0
        : Math.max(180, Math.round(motionProfile.guidedAvatarTransition.duration * 1000 * 0.9));
      selectionExplainTimeoutRef.current = window.setTimeout(() => {
        selectionExplainTimeoutRef.current = null;
        setGuidedTutorTarget((current) =>
          isSelectionGuidedTutorTarget(current) ? null : current
        );
        handleOpenChat('selection_explain');
        void sendMessage('Wyjaśnij zaznaczony fragment krok po kroku.', {
          promptMode: 'selected_text',
          selectedText: selectionText,
          focusKind: 'selection',
          focusId: 'selection',
          focusLabel: selectionText,
          assignmentId: null,
          interactionIntent: 'explain',
        }).finally(() => {
          trackKangurClientEvent('kangur_ai_tutor_selection_guidance_completed', {
            ...telemetryContext,
            selectionLength: selectionText.length,
          });
        });
      }, guidanceDelayMs);
    },
    [
      handleOpenChat,
      motionProfile.guidedAvatarTransition.duration,
      activeSelectionPageRect,
      focusSelectionPageRect,
      prefersReducedMotion,
      sendMessage,
      telemetryContext,
    ]
  );

  const handleHomeOnboardingBack = useCallback((): void => {
    if (homeOnboardingStepIndex === null || homeOnboardingStepIndex <= 0) {
      return;
    }

    setHomeOnboardingStepIndex(homeOnboardingStepIndex - 1);
  }, [homeOnboardingStepIndex]);

  const handleStartHomeOnboarding = useCallback((): void => {
    if (!canStartHomeOnboardingManually) {
      return;
    }

    const nextRecord = persistHomeOnboardingRecord('shown');
    setHomeOnboardingRecord(nextRecord);
    setHomeOnboardingStepIndex(0);
    homeOnboardingShownForCurrentEntryRef.current = true;
    trackKangurClientEvent('kangur_ai_tutor_home_onboarding_started_manual', {
      stepCount: homeOnboardingSteps.length,
      mode: homeOnboardingMode,
      previousStatus: homeOnboardingRecord?.status ?? null,
    });
  }, [
    canStartHomeOnboardingManually,
    homeOnboardingMode,
    homeOnboardingRecord?.status,
    homeOnboardingSteps.length,
  ]);

  const finishHomeOnboarding = useCallback(
    (
      status: KangurAiTutorHomeOnboardingRecord['status']
    ): KangurAiTutorHomeOnboardingRecord | null => {
      const nextRecord = persistHomeOnboardingRecord(status);
      setDraggedAvatarPoint(null);
      clearPersistedTutorAvatarPosition();
      setHomeOnboardingStepIndex(null);
      closeChat();
      return nextRecord;
    },
    [closeChat]
  );

  const handleHomeOnboardingFinishEarly = useCallback((): void => {
    const nextRecord = finishHomeOnboarding('dismissed');
    setHomeOnboardingRecord(nextRecord);
    trackKangurClientEvent('kangur_ai_tutor_home_onboarding_dismissed', {
      stepId: homeOnboardingStep?.id ?? null,
      stepIndex: homeOnboardingStepIndex,
    });
  }, [finishHomeOnboarding, homeOnboardingStep?.id, homeOnboardingStepIndex]);

  const handleHomeOnboardingAdvance = useCallback((): void => {
    if (homeOnboardingStepIndex === null) {
      return;
    }

    const nextIndex = homeOnboardingStepIndex + 1;
    if (nextIndex >= homeOnboardingSteps.length) {
      const nextRecord = finishHomeOnboarding('completed');
      setHomeOnboardingRecord(nextRecord);
      trackKangurClientEvent('kangur_ai_tutor_home_onboarding_completed', {
        stepCount: homeOnboardingSteps.length,
      });
      return;
    }

    setHomeOnboardingStepIndex(nextIndex);
  }, [finishHomeOnboarding, homeOnboardingStepIndex, homeOnboardingSteps.length]);

  const handleAskAbout = useCallback((): void => {
    const persistedSelectedText = persistSelectionContext();
    if (!persistedSelectedText) {
      return;
    }

    startGuidedSelectionExplanation(persistedSelectedText);
  }, [persistSelectionContext, startGuidedSelectionExplanation]);

  const handleSelectionActionMouseDown = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>): void => {
      // Keep the browser selection alive long enough for the CTA click to open the tutor
      // against the current highlighted fragment.
      event.preventDefault();
    },
    []
  );

  const handleAvatarMouseDown = (event: React.MouseEvent<HTMLButtonElement>): void => {
    if (!isOpen && allowSelectedTextSupport && selectedText && selectionRect) {
      // Keep the lesson selection stable when opening via the launcher.
      event.preventDefault();
    }
  };

  const handleAvatarClick = useCallback((): void => {
    if (suppressAvatarClickRef.current) {
      suppressAvatarClickRef.current = false;
      return;
    }

    if (homeOnboardingStepIndex !== null) {
      const nextRecord = finishHomeOnboarding('dismissed');
      setHomeOnboardingRecord(nextRecord);
      return;
    }

    if (guestIntroVisible || guestIntroHelpVisible) {
      handleCloseGuestIntroCard();
      return;
    }

    if (launcherPromptVisible) {
      handleCloseLauncherPrompt();
      return;
    }

    if (guidedTutorTarget) {
      if (selectionExplainTimeoutRef.current !== null) {
        window.clearTimeout(selectionExplainTimeoutRef.current);
        selectionExplainTimeoutRef.current = null;
      }
      setGuidedTutorTarget(null);
      return;
    }

    if (isOpen) {
      handleCloseChat('toggle');
      return;
    }

    if (shouldOfferLauncherPrompt) {
      setLauncherPromptVisible(true);
      return;
    }

    handleOpenChat('toggle');
  }, [
    finishHomeOnboarding,
    guestIntroHelpVisible,
    guestIntroVisible,
    guidedTutorTarget,
    handleCloseGuestIntroCard,
    handleCloseChat,
    handleCloseLauncherPrompt,
    handleOpenChat,
    homeOnboardingStepIndex,
    isOpen,
    launcherPromptVisible,
    shouldOfferLauncherPrompt,
  ]);

  const handleFloatingAvatarPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>): void => {
      if (event.button !== 0 || isOpen) {
        return;
      }

      const origin = getMotionPositionPoint(avatarStyle);
      if (!origin) {
        return;
      }

      avatarDragStateRef.current = {
        moved: false,
        origin,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };
      setIsAvatarDragging(true);
      suppressAvatarClickRef.current = false;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [avatarStyle, isOpen]
  );

  const handleFloatingAvatarPointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>): void => {
      const dragState = avatarDragStateRef.current;
      if (dragState?.pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      const hasMovedEnough = Math.hypot(deltaX, deltaY) >= 6;
      const nextPoint = clampAvatarPoint(
        {
          x: dragState.origin.x + deltaX,
          y: dragState.origin.y + deltaY,
        },
        viewport
      );

      if (hasMovedEnough) {
        dragState.moved = true;
        suppressAvatarClickRef.current = true;
        if (homeOnboardingStepIndex !== null) {
          setHomeOnboardingStepIndex(null);
        }
        if (guidedTutorTarget) {
          if (selectionExplainTimeoutRef.current !== null) {
            window.clearTimeout(selectionExplainTimeoutRef.current);
            selectionExplainTimeoutRef.current = null;
          }
          setGuidedTutorTarget(null);
        }
      }

      setDraggedAvatarPoint(nextPoint);
    },
    [guidedTutorTarget, homeOnboardingStepIndex, viewport]
  );

  const finishFloatingAvatarDrag = useCallback(
    (pointerId: number): void => {
      const dragState = avatarDragStateRef.current;
      if (dragState?.pointerId !== pointerId) {
        return;
      }

      if (dragState.moved && draggedAvatarPoint) {
        persistTutorAvatarPosition({
          left: draggedAvatarPoint.x,
          top: draggedAvatarPoint.y,
        });
      }

      avatarDragStateRef.current = null;
      setIsAvatarDragging(false);
    },
    [draggedAvatarPoint]
  );

  const handleFloatingAvatarPointerUp = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>): void => {
      finishFloatingAvatarDrag(event.pointerId);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    },
    [finishFloatingAvatarDrag]
  );

  const handleFloatingAvatarPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>): void => {
      finishFloatingAvatarDrag(event.pointerId);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    },
    [finishFloatingAvatarDrag]
  );

  const handleSend = async (): Promise<void> => {
    const text = inputValue.trim();
    if (!text || isLoading || !canSendMessages) return;

    const guestLoginIntent = isAnonymousVisitor
      ? resolveGuestLoginGuidanceIntent(text)
      : null;

    if (guestLoginIntent) {
      setInputValue('');
      startGuidedGuestLogin(guestLoginIntent, 'chat_message');
      return;
    }

    setInputValue('');
    if (activeSelectedText) {
      persistSelectionGeometry();
    }
    await sendMessage(text, {
      promptMode: activeSelectedText ? 'selected_text' : 'chat',
      selectedText: activeSelectedText,
      focusKind: normalizeConversationFocusKind(activeFocus.kind),
      focusId: activeFocus.id,
      focusLabel: activeFocus.label,
      assignmentId: activeFocus.assignmentId,
      interactionIntent:
        activeSelectedText || activeFocus.kind === 'review'
          ? activeFocus.kind === 'review'
            ? 'review'
            : 'explain'
          : undefined,
    });
    if (activeSelectedText) {
      clearSelection();
      setHighlightedText(null);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleQuickAction = async (
    action: TutorQuickAction,
    options?: {
      source?: 'quick_action' | 'proactive_nudge';
    }
  ): Promise<void> => {
    if (isLoading || !canSendMessages) return;
    if (activeSelectedText) {
      persistSelectionGeometry();
    }
    trackKangurClientEvent('kangur_ai_tutor_quick_action_clicked', {
      ...telemetryContext,
      source: options?.source ?? 'quick_action',
      action: action.id,
      promptMode: action.promptMode,
      bridgeActionId: bridgeQuickAction?.id ?? null,
      isBridgeAction: action.id === bridgeQuickAction?.id,
      hasSelectedText: Boolean(activeSelectedText),
      focusKind: activeFocus.kind ?? null,
    });
    await sendMessage(action.prompt, {
      promptMode: action.promptMode,
      selectedText: activeSelectedText,
      focusKind: normalizeConversationFocusKind(activeFocus.kind),
      focusId: activeFocus.id,
      focusLabel: activeFocus.label,
      assignmentId: activeFocus.assignmentId,
      interactionIntent:
        action.interactionIntent ??
        getInteractionIntent(action.promptMode, activeFocus.kind, sessionContext?.answerRevealed),
    });
    if (activeSelectedText) {
      clearSelection();
      setHighlightedText(null);
    }
  };

  const handleFocusSelectedFragment = useCallback((): void => {
    if (!activeSelectionPageRect) {
      return;
    }

    focusSelectionPageRect(activeSelectionPageRect, { forceScroll: true, spotlight: true });
    trackKangurClientEvent('kangur_ai_tutor_selection_refocused', {
      ...telemetryContext,
      selectionLength: activeSelectedText?.length ?? 0,
    });
  }, [activeSelectedText, activeSelectionPageRect, focusSelectionPageRect, telemetryContext]);

  const handleDetachSelectedFragment = useCallback((): void => {
    setDismissedSelectedText(activeSelectedText);
    clearSelection();
    setHighlightedText(null);
    setPersistedSelectionRect(null);
    setPersistedSelectionPageRect(null);
    setPersistedSelectionContainerRect(null);
    trackKangurClientEvent('kangur_ai_tutor_selection_detached', {
      ...telemetryContext,
      selectionLength: activeSelectedText?.length ?? 0,
      messageCount: messages.length,
    });
  }, [
    activeSelectedText,
    clearSelection,
    messages.length,
    setHighlightedText,
    telemetryContext,
  ]);

  const handleFollowUpClick = (
    action: KangurAiTutorFollowUpAction,
    messageIndex: number,
    href: string
  ): void => {
    const targetLocation = resolveTutorFollowUpLocation(href);
    const currentLocation = getCurrentTutorLocation();

    if (targetLocation && currentLocation) {
      persistPendingTutorFollowUp({
        version: 1,
        href,
        pathname: targetLocation.pathname,
        search: targetLocation.search,
        actionId: action.id,
        actionLabel: action.label,
        actionReason: action.reason ?? null,
        actionPage: action.page,
        messageIndex,
        hasQuery: Boolean(action.query && Object.keys(action.query).length > 0),
        sourceSurface: telemetryContext.surface,
        sourceContentId: telemetryContext.contentId,
        sourceTitle: telemetryContext.title,
        sourcePathname: currentLocation.pathname,
        sourceSearch: currentLocation.search,
        createdAt: new Date().toISOString(),
      });
    }

    trackKangurClientEvent('kangur_ai_tutor_follow_up_clicked', {
      ...telemetryContext,
      actionId: action.id,
      actionPage: action.page,
      messageIndex,
      hasQuery: Boolean(action.query && Object.keys(action.query).length > 0),
    });
  };

  const handleMessageFeedback = useCallback(
    (
      messageIndex: number,
      message: {
        content: string;
        coachingFrame?: { mode: string } | null;
        followUpActions?: unknown[];
        sources?: unknown[];
      },
      feedback: TutorMessageFeedback
    ): void => {
      const feedbackKey = getAssistantMessageFeedbackKey(tutorSessionKey, messageIndex, message);
      let shouldTrack = false;

      setMessageFeedbackByKey((current) => {
        if (current[feedbackKey]) {
          return current;
        }

        shouldTrack = true;
        return {
          ...current,
          [feedbackKey]: feedback,
        };
      });

      if (!shouldTrack) {
        return;
      }

      trackKangurClientEvent('kangur_ai_tutor_feedback_submitted', {
        ...telemetryContext,
        feedback,
        messageIndex,
        coachingMode: message.coachingFrame?.mode ?? null,
        hasFollowUpActions: Boolean(message.followUpActions?.length),
        hasSources: Boolean(message.sources?.length),
      });
    },
    [telemetryContext, tutorSessionKey]
  );

  const handleCloseGuidedCallout = useCallback((): void => {
    if (guidedMode === 'home_onboarding') {
      handleHomeOnboardingFinishEarly();
      return;
    }

    if (selectionExplainTimeoutRef.current !== null) {
      window.clearTimeout(selectionExplainTimeoutRef.current);
      selectionExplainTimeoutRef.current = null;
    }

    setGuidedTutorTarget(null);
    setDraggedAvatarPoint(null);
    clearPersistedTutorAvatarPosition();
    closeChat();
  }, [closeChat, guidedMode, handleHomeOnboardingFinishEarly]);

  const shouldRenderLauncherPromptUi =
    !isTutorHidden &&
    launcherPromptVisible &&
    !shouldRenderGuestIntroUi &&
    !isGuidedTutorMode &&
    !askModalVisible &&
    !isOpen;

  if (
    (!enabled &&
      !shouldRenderGuestIntroUi &&
      !shouldRenderLauncherPromptUi &&
      !isGuidedTutorMode &&
      !askModalVisible &&
      !isAnonymousVisitor) ||
    !mounted
  ) {
    return null;
  }

  const guestTutorLabel = tutorName.trim() || 'Tutor';
  const launcherPromptHeadline = 'How could I help you today?';
  const launcherPromptDescription =
    'Kliknij „Zapytaj”, a otworzę okno pytań do AI Tutora.';
  const guestIntroHeadline = guestIntroHelpVisible
    ? 'Pokażę Ci, gdzie kliknąć.'
    : 'Czy chcesz pomocy z logowaniem albo założeniem konta?';
  const guestIntroDescription = guestIntroHelpVisible
    ? 'Jeśli masz już konto, pokażę Ci przycisk logowania. Jeśli jeszcze nie, pokażę Ci, gdzie założyć konto rodzica i jak potwierdzić e-mail.'
    : shouldRepeatGuestIntroOnEntry
      ? 'Mogę pokazać, gdzie się zalogować albo jak założyć konto rodzica.'
      : 'Mogę pokazać, gdzie się zalogować albo jak założyć konto rodzica. To pytanie pojawia się tylko raz przy pierwszej anonimowej wizycie na tym urządzeniu i łączu.';

  return createPortal(
    <>
      <AnimatePresence>
        {shouldRenderSelectionAction ? (
          <motion.div
            key='highlight-tooltip'
            data-testid='kangur-ai-tutor-selection-action'
            data-selection-placement={selectionActionLayout?.placement ?? 'top'}
            initial={
              prefersReducedMotion
                ? reducedMotionTransitions.stableState
                : { opacity: 0, y: 4, scale: 0.96 }
            }
            animate={reducedMotionTransitions.stableState}
            exit={
              prefersReducedMotion
                ? reducedMotionTransitions.stableState
                : { opacity: 0, y: 4, scale: 0.96 }
            }
            transition={prefersReducedMotion ? reducedMotionTransitions.instant : undefined}
            style={selectionActionStyle ?? undefined}
            className='z-[70]'
          >
            <KangurButton
              type='button'
              size='sm'
              variant='primary'
              className='min-w-[124px] shadow-[0_12px_28px_-18px_rgba(15,23,42,0.42)]'
              onMouseDown={handleSelectionActionMouseDown}
              onClick={handleAskAbout}
            >
              Zapytaj o to
            </KangurButton>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {shouldRenderGuestIntroUi && isAnonymousVisitor ? (
          <motion.div
            key={guestIntroHelpVisible ? 'guest-help' : 'guest-intro'}
            data-testid={
              guestIntroHelpVisible
                ? 'kangur-ai-tutor-guest-assistance'
                : 'kangur-ai-tutor-guest-intro'
            }
            initial={
              prefersReducedMotion
                ? reducedMotionTransitions.stableState
                : { opacity: 0, y: 8, scale: 0.98 }
            }
            animate={reducedMotionTransitions.stableState}
            exit={
              prefersReducedMotion
                ? reducedMotionTransitions.stableState
                : { opacity: 0, y: 8, scale: 0.98 }
            }
            transition={prefersReducedMotion ? reducedMotionTransitions.instant : undefined}
            style={getGuestIntroPanelStyle(viewport)}
            className='fixed z-[75]'
          >
            <KangurGlassPanel
              surface='warmGlow'
              variant='soft'
              padding='lg'
              className='border-amber-200/80 shadow-[0_26px_60px_-34px_rgba(180,83,9,0.38)]'
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <div className='text-[10px] font-semibold tracking-[0.16em] text-amber-700'>
                    {guestTutorLabel}
                  </div>
                  <div className='mt-1 text-sm font-semibold leading-relaxed text-slate-900'>
                    {guestIntroHeadline}
                  </div>
                  <div className='mt-2 text-xs leading-relaxed text-slate-600'>
                    {guestIntroDescription}
                  </div>
                </div>
                <button
                  data-testid='kangur-ai-tutor-guest-intro-close'
                  type='button'
                  onClick={handleCloseGuestIntroCard}
                  className='shrink-0 rounded-full border border-amber-200/80 bg-white/80 p-1 text-amber-900 transition-colors hover:bg-white'
                  aria-label='Zamknij okno AI Tutora'
                >
                  <X className='h-3.5 w-3.5' />
                </button>
              </div>

              {guestIntroHelpVisible ? (
                <div className='mt-4 flex flex-wrap gap-2'>
                  <KangurButton
                    type='button'
                    size='sm'
                    variant='surface'
                    onClick={() => handleOpenAskModal('guest_assistance')}
                  >
                    Zapytaj
                  </KangurButton>
                  <KangurButton
                    type='button'
                    size='sm'
                    variant='primary'
                    onClick={handleGuestIntroLogin}
                  >
                    Pokaż logowanie
                  </KangurButton>
                  <KangurButton
                    type='button'
                    size='sm'
                    variant='surface'
                    onClick={handleGuestIntroCreateAccount}
                  >
                    Pokaż tworzenie konta
                  </KangurButton>
                  <KangurButton
                    type='button'
                    size='sm'
                    variant='surface'
                    onClick={handleGuestIntroHelpClose}
                  >
                    Przeglądaj dalej
                  </KangurButton>
                </div>
              ) : (
                <div className='mt-4 flex flex-wrap gap-2'>
                  <KangurButton
                    type='button'
                    size='sm'
                    variant='surface'
                    onClick={() => handleOpenAskModal('guest_intro')}
                  >
                    Zapytaj
                  </KangurButton>
                  <KangurButton
                    type='button'
                    size='sm'
                    variant='primary'
                    onClick={handleGuestIntroAccept}
                  >
                    Tak
                  </KangurButton>
                  <KangurButton
                    type='button'
                    size='sm'
                    variant='surface'
                    onClick={handleGuestIntroDismiss}
                  >
                    Nie
                  </KangurButton>
                </div>
              )}
            </KangurGlassPanel>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {shouldRenderLauncherPromptUi ? (
          <motion.div
            key='launcher-prompt'
            data-testid='kangur-ai-tutor-launcher-prompt'
            initial={
              prefersReducedMotion
                ? reducedMotionTransitions.stableState
                : { opacity: 0, y: 8, scale: 0.98 }
            }
            animate={reducedMotionTransitions.stableState}
            exit={
              prefersReducedMotion
                ? reducedMotionTransitions.stableState
                : { opacity: 0, y: 8, scale: 0.98 }
            }
            transition={prefersReducedMotion ? reducedMotionTransitions.instant : undefined}
            style={getGuestIntroPanelStyle(viewport)}
            className='fixed z-[75]'
          >
            <KangurGlassPanel
              surface='warmGlow'
              variant='soft'
              padding='lg'
              className='border-amber-200/80 shadow-[0_26px_60px_-34px_rgba(180,83,9,0.38)]'
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <div className='text-[10px] font-semibold tracking-[0.16em] text-amber-700'>
                    {guestTutorLabel}
                  </div>
                  <div className='mt-1 text-sm font-semibold leading-relaxed text-slate-900'>
                    {launcherPromptHeadline}
                  </div>
                  <div className='mt-2 text-xs leading-relaxed text-slate-600'>
                    {launcherPromptDescription}
                  </div>
                </div>
                <button
                  data-testid='kangur-ai-tutor-launcher-prompt-close'
                  type='button'
                  onClick={handleCloseLauncherPrompt}
                  className='shrink-0 rounded-full border border-amber-200/80 bg-white/80 p-1 text-amber-900 transition-colors hover:bg-white'
                  aria-label='Zamknij okno AI Tutora'
                >
                  <X className='h-3.5 w-3.5' />
                </button>
              </div>
              <div className='mt-4 flex flex-wrap gap-2'>
                <KangurButton
                  type='button'
                  size='sm'
                  variant='primary'
                  onClick={() => handleOpenAskModal('guest_intro')}
                >
                  Zapytaj
                </KangurButton>
              </div>
            </KangurGlassPanel>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {guidedMode === 'selection' && selectionSpotlightStyle ? (
          <motion.div
            key='guided-selection-spotlight'
            data-testid='kangur-ai-tutor-selection-spotlight'
            initial={
              prefersReducedMotion
                ? reducedMotionTransitions.stableState
                : { opacity: 0, scale: 0.98 }
            }
            animate={reducedMotionTransitions.stableState}
            exit={
              prefersReducedMotion
                ? reducedMotionTransitions.stableState
                : { opacity: 0, scale: 0.98 }
            }
            transition={prefersReducedMotion ? reducedMotionTransitions.instant : undefined}
            style={selectionSpotlightStyle}
            className='pointer-events-none fixed z-[72] rounded-[22px] border-2 border-amber-400/85 bg-amber-100/20 shadow-[0_0_0_8px_rgba(251,191,36,0.18)]'
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectionContextSpotlightStyle ? (
          <motion.div
            key={`selection-context-spotlight:${selectionContextSpotlightTick}`}
            data-testid='kangur-ai-tutor-selection-context-spotlight'
            initial={
              prefersReducedMotion
                ? reducedMotionTransitions.stableState
                : { opacity: 0, scale: 0.985 }
            }
            animate={reducedMotionTransitions.stableState}
            exit={
              prefersReducedMotion
                ? reducedMotionTransitions.stableState
                : { opacity: 0, scale: 0.985 }
            }
            transition={prefersReducedMotion ? reducedMotionTransitions.instant : undefined}
            style={selectionContextSpotlightStyle}
            className='pointer-events-none fixed z-[68] rounded-[22px] border-2 border-amber-300/75 bg-amber-100/10 shadow-[0_0_0_6px_rgba(251,191,36,0.12)]'
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {!isTutorHidden &&
        isGuidedTutorMode &&
        guidedFocusRect &&
        guidedCalloutStyle &&
        (guidedMode === 'home_onboarding' || guidedMode === 'selection' || isAnonymousVisitor) ? (
            <>
              <motion.div
                key={
                  guidedMode === 'home_onboarding'
                    ? `guided-callout:home:${homeOnboardingStep?.id ?? 'step'}`
                    : guidedMode === 'selection'
                      ? 'guided-callout:selection'
                      : `guided-callout:${isAuthGuidedTutorTarget(guidedTutorTarget) ? guidedTutorTarget.authMode : 'auth'}`
                }
                data-testid={
                  guidedMode === 'home_onboarding'
                    ? 'kangur-ai-tutor-home-onboarding'
                    : guidedMode === 'selection'
                      ? 'kangur-ai-tutor-selection-guided-callout'
                      : 'kangur-ai-tutor-guided-login-help'
                }
                data-guidance-motion='gentle'
                data-guidance-placement={guidedCalloutLayout?.placement ?? 'top'}
                initial={
                  prefersReducedMotion
                    ? reducedMotionTransitions.stableState
                    : { opacity: 0, y: 8, scale: 0.98 }
                }
                animate={reducedMotionTransitions.stableState}
                exit={
                  prefersReducedMotion
                    ? reducedMotionTransitions.stableState
                    : { opacity: 0, y: 8, scale: 0.98 }
                }
                transition={
                  prefersReducedMotion
                    ? reducedMotionTransitions.instant
                    : {
                      duration: Math.max(0.34, motionProfile.guidedAvatarTransition.duration * 0.78),
                      ease: motionProfile.guidedAvatarTransition.ease,
                    }
                }
                style={guidedCalloutStyle}
                className='z-[73]'
              >
                <KangurGlassPanel
                  surface='warmGlow'
                  variant='soft'
                  padding='md'
                  className='border-amber-200/80 shadow-[0_20px_48px_-30px_rgba(180,83,9,0.38)]'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='text-[10px] font-semibold tracking-[0.16em] text-amber-700'>
                      {guidedMode === 'home_onboarding'
                        ? 'Pomocnik AI · plan strony'
                        : guidedMode === 'selection'
                          ? `${tutorName.trim() || 'Tutor'} · wyjaśnienie`
                          : guestTutorLabel}
                    </div>
                    {guidedMode !== 'selection' ? (
                      <button
                        data-testid='kangur-ai-tutor-guided-callout-close'
                        type='button'
                        onClick={handleCloseGuidedCallout}
                        className='shrink-0 rounded-full border border-amber-200/80 bg-white/80 p-1 text-amber-900 transition-colors hover:bg-white'
                        aria-label='Zamknij okno AI Tutora'
                      >
                        <X className='h-3.5 w-3.5' />
                      </button>
                    ) : null}
                  </div>
                  {guidedCalloutStepLabel ? (
                    <div className='mt-1 text-[10px] font-semibold tracking-[0.16em] text-slate-500'>
                      {guidedCalloutStepLabel}
                    </div>
                  ) : null}
                  <div className='mt-1 text-sm font-semibold leading-relaxed text-slate-900'>
                    {guidedCalloutTitle}
                  </div>
                  <div className='mt-2 text-xs leading-relaxed text-slate-600'>
                    {guidedCalloutDetail}
                  </div>
                  {guidedSelectionPreview ? (
                    <div className='mt-3 rounded-2xl border border-amber-200/80 bg-white/80 px-3 py-2 text-xs italic leading-relaxed text-slate-700'>
                      „{guidedSelectionPreview}”
                      {isSelectionGuidedTutorTarget(guidedTutorTarget) &&
                      guidedTutorTarget.selectedText.length > guidedSelectionPreview.length
                        ? '…'
                        : ''}
                    </div>
                  ) : null}
                  <div className='mt-3 flex flex-wrap justify-end gap-2'>
                    {guidedMode === 'home_onboarding' ? (
                      <>
                        {homeOnboardingStepIndex !== null && homeOnboardingStepIndex > 0 ? (
                          <KangurButton
                            type='button'
                            size='sm'
                            variant='surface'
                            onClick={handleHomeOnboardingBack}
                          >
                          Wstecz
                          </KangurButton>
                        ) : null}
                        <KangurButton
                          type='button'
                          size='sm'
                          variant='surface'
                          onClick={handleHomeOnboardingFinishEarly}
                        >
                        Zakończ
                        </KangurButton>
                        <KangurButton
                          type='button'
                          size='sm'
                          variant='primary'
                          onClick={handleHomeOnboardingAdvance}
                        >
                        Rozumiem
                        </KangurButton>
                      </>
                    ) : guidedMode === 'selection' ? (
                      <div className='rounded-full border border-amber-200/80 bg-white/85 px-3 py-1 text-[11px] font-semibold text-amber-800'>
                        Już przygotowuję wyjaśnienie…
                      </div>
                    ) : (
                      <>
                        <KangurButton
                          type='button'
                          size='sm'
                          variant='surface'
                          onClick={() => handleOpenAskModal('guided_help')}
                        >
                        Zapytaj
                        </KangurButton>
                        <KangurButton
                          type='button'
                          size='sm'
                          variant='surface'
                          onClick={handleCloseGuidedCallout}
                        >
                        Rozumiem
                        </KangurButton>
                      </>
                    )}
                  </div>
                </KangurGlassPanel>
              </motion.div>
            </>
          ) : null}
      </AnimatePresence>

      {showFloatingAvatar ? (
        <motion.button
          data-testid='kangur-ai-tutor-avatar'
          data-anchor-kind={avatarAnchorKind}
          data-avatar-placement={floatingAvatarPlacement}
          data-guidance-target={
            guidedMode === 'home_onboarding'
              ? homeOnboardingStep?.kind ?? 'none'
              : guidedTutorTarget?.kind ?? 'none'
          }
          data-guidance-motion={isGuidedTutorMode ? 'gentle' : 'standard'}
          data-guidance-pointer={guidedAvatarArrowhead ? 'rim-arrowhead' : 'none'}
          data-guidance-interaction={isGuidedTutorMode ? 'suppressed' : 'interactive'}
          data-is-dragging={isAvatarDragging ? 'true' : 'false'}
          data-motion-preset={motionProfile.kind}
          data-motion-behavior={prefersReducedMotion ? 'reduced' : 'animated'}
          data-ui-mode={uiMode}
          type='button'
          onMouseDown={handleAvatarMouseDown}
          onPointerDown={handleFloatingAvatarPointerDown}
          onPointerMove={handleFloatingAvatarPointerMove}
          onPointerUp={handleFloatingAvatarPointerUp}
          onPointerCancel={handleFloatingAvatarPointerCancel}
          onClick={handleAvatarClick}
          initial={false}
          animate={avatarStyle}
          transition={
            prefersReducedMotion
              ? reducedMotionTransitions.instant
              : isGuidedTutorMode || isAskModalMode
                ? motionProfile.guidedAvatarTransition
                : motionProfile.avatarTransition
          }
          whileHover={
            prefersReducedMotion || isGuidedTutorMode || isAskModalMode
              ? undefined
              : { scale: motionProfile.hoverScale }
          }
          whileTap={
            prefersReducedMotion || isGuidedTutorMode || isAskModalMode
              ? undefined
              : { scale: motionProfile.tapScale }
          }
          className={cn(
            'fixed touch-none',
            isAskModalMode ? 'z-[78]' : 'z-[74]',
            isAskModalMode
              ? 'pointer-events-none cursor-default'
              : isAvatarDragging
                ? 'cursor-grabbing'
                : 'cursor-grab',
            avatarButtonClassName
          )}
          style={avatarButtonStyle}
          aria-label={isOpen ? 'Zamknij pomocnika' : 'Otwórz pomocnika AI'}
        >
          <TutorMoodAvatar
            svgContent={tutorAvatarSvg}
            avatarImageUrl={tutorAvatarImageUrl}
            label={`${tutorName} avatar (${tutorMoodId})`}
            className='relative z-[1] h-12 w-12 border border-white/25 bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]'
            svgClassName='[&_svg]:drop-shadow-[0_1px_1px_rgba(15,23,42,0.1)]'
            data-testid='kangur-ai-tutor-avatar-image'
          />
          <span
            aria-hidden='true'
            data-testid='kangur-ai-tutor-avatar-rim'
            className='pointer-events-none absolute inset-0 z-[2] rounded-full border-2'
            style={{ borderColor: FLOATING_TUTOR_AVATAR_RIM_COLOR }}
          />
          {guidedAvatarArrowhead ? (
            <span
              aria-hidden='true'
              data-testid='kangur-ai-tutor-guided-arrowhead'
              data-guidance-layer='below-rim'
              data-pointer-side={guidedAvatarArrowhead.side}
              data-guidance-angle={guidedAvatarArrowhead.angle.toFixed(2)}
              data-guidance-render-angle={guidedAvatarArrowheadDisplayAngleLabel}
              data-guidance-quadrant={guidedAvatarArrowhead.quadrant}
              data-guidance-rim-color={FLOATING_TUTOR_AVATAR_RIM_COLOR}
              className='pointer-events-none absolute z-0 h-[18px] w-[18px]'
              style={{
                left: guidedAvatarArrowhead.left,
                top: guidedAvatarArrowhead.top,
                transform: `translate(-50%, -50%) rotate(${guidedAvatarArrowheadDisplayAngle ?? guidedAvatarArrowhead.angle}deg)`,
                transition: guidedArrowheadTransition,
              }}
            >
              <svg
                viewBox='0 0 18 18'
                className='h-[18px] w-[18px] overflow-visible drop-shadow-[0_1px_1px_rgba(15,23,42,0.18)]'
              >
                <circle
                  cx='12.5'
                  cy='9'
                  r='3.2'
                  fill={FLOATING_TUTOR_AVATAR_RIM_COLOR}
                />
                <path
                  d='M1.6 9 L12.4 3.2 L10 9 L12.4 14.8 Z'
                  fill={FLOATING_TUTOR_AVATAR_RIM_COLOR}
                />
              </svg>
            </span>
          ) : null}
          {hasNewMessage && !isOpen && (
            <span className='absolute top-1 right-1 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white animate-pulse' />
          )}
        </motion.button>
      ) : null}

      <AnimatePresence>
        {isOpen && !isTutorHidden && !isGuidedTutorMode && !shouldRenderGuestIntroUi && (
          <>
            {isAskModalMode || bubblePlacement.mode === 'sheet' ? (
              <motion.button
                key={isAskModalMode ? 'ask-modal-backdrop' : 'chat-backdrop'}
                data-testid={
                  isAskModalMode
                    ? 'kangur-ai-tutor-ask-modal-backdrop'
                    : 'kangur-ai-tutor-backdrop'
                }
                type='button'
                aria-label='Zamknij pomocnika'
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
                transition={prefersReducedMotion ? reducedMotionTransitions.instant : { duration: 0.18 }}
                className={cn(
                  'fixed inset-0 cursor-pointer',
                  isAskModalMode ? 'z-[76] bg-slate-900/32 backdrop-blur-[2px]' : 'z-[62] bg-slate-900/18'
                )}
                onClick={(): void =>
                  isAskModalMode ? handleCloseAskModal('outside') : handleCloseChat('outside')
                }
              />
            ) : null}
            <motion.div
              key={isAskModalMode ? 'ask-modal' : 'chat-panel'}
              ref={panelRef}
              data-testid={isAskModalMode ? 'kangur-ai-tutor-ask-modal' : 'kangur-ai-tutor-panel'}
              data-layout={isAskModalMode ? 'modal' : bubblePlacement.mode}
              data-avatar-placement={panelAvatarPlacement}
              data-launch-origin={bubblePlacement.launchOrigin}
              data-motion-behavior={prefersReducedMotion ? 'reduced' : 'animated'}
              data-motion-preset={motionProfile.kind}
              data-motion-state={panelMotionState}
              data-open-animation={panelOpenAnimation}
              data-placement-strategy={bubblePlacement.strategy}
              data-has-pointer={!isAskModalMode && avatarPointer ? 'true' : 'false'}
              data-pointer-side={!isAskModalMode ? avatarPointer?.side ?? 'none' : 'none'}
              data-ui-mode={uiMode}
              role={isAskModalMode ? 'dialog' : undefined}
              aria-modal={isAskModalMode ? 'true' : undefined}
              initial={
                isAskModalMode
                  ? prefersReducedMotion
                    ? reducedMotionTransitions.stableState
                    : { opacity: 0, y: 18, scale: 0.98 }
                  : prefersReducedMotion
                    ? bubblePlacement.mode === 'sheet'
                      ? reducedMotionTransitions.staticSheetState
                      : reducedMotionTransitions.stableState
                    : panelOpenAnimation === 'sheet'
                      ? { opacity: 0, y: 28 }
                      : panelOpenAnimation === 'fade'
                        ? { opacity: 0 }
                        : {
                          opacity: 0,
                          x: attachedLaunchOffset.x,
                          y: attachedLaunchOffset.y,
                          scale: 0.97,
                        }
              }
              animate={
                isAskModalMode
                  ? { opacity: 1, y: 0, scale: 1 }
                  : {
                    ...bubblePlacement.style,
                    opacity: 1,
                    x: 0,
                    y: 0,
                    ...(bubblePlacement.mode === 'sheet' ? {} : { scale: 1 }),
                  }
              }
              exit={
                isAskModalMode
                  ? prefersReducedMotion
                    ? reducedMotionTransitions.stableState
                    : { opacity: 0, y: 18, scale: 0.98 }
                  : prefersReducedMotion
                    ? bubblePlacement.mode === 'sheet'
                      ? reducedMotionTransitions.staticSheetState
                      : reducedMotionTransitions.stableState
                    : panelOpenAnimation === 'sheet'
                      ? { opacity: 0, y: 28 }
                      : panelOpenAnimation === 'fade'
                        ? { opacity: 0 }
                        : {
                          opacity: 0,
                          x: attachedLaunchOffset.x * 0.18,
                          y: attachedLaunchOffset.y * 0.18,
                          scale: 0.97,
                        }
              }
              transition={isAskModalMode ? motionProfile.bubbleTransition : panelTransition}
              className={
                isAskModalMode
                  ? 'fixed inset-0 z-[77] flex items-center justify-center px-4 pt-10 pb-6 pointer-events-none'
                  : 'fixed z-[65]'
              }
              style={
                isAskModalMode
                  ? undefined
                  : bubblePlacement.width
                    ? { width: bubblePlacement.width }
                    : undefined
              }
            >
              {!isAskModalMode && avatarPointer ? (
                <svg
                  aria-hidden='true'
                  data-testid='kangur-ai-tutor-pointer'
                  data-pointer-side={avatarPointer.side}
                  className='pointer-events-none absolute z-0 overflow-visible'
                  style={{
                    left: avatarPointer.left,
                    top: avatarPointer.top,
                    width: avatarPointer.width,
                    height: avatarPointer.height,
                  }}
                  viewBox={`0 0 ${avatarPointer.width} ${avatarPointer.height}`}
                >
                  <defs>
                    <marker
                      id={pointerMarkerId}
                      markerWidth='9'
                      markerHeight='9'
                      refX='7'
                      refY='4.5'
                      orient='auto'
                      viewBox='0 0 9 9'
                    >
                      <path d='M0 0 L9 4.5 L0 9 Z' fill='#b45309' />
                    </marker>
                  </defs>
                  <line
                    x1={avatarPointer.start.x}
                    y1={avatarPointer.start.y}
                    x2={avatarPointer.end.x}
                    y2={avatarPointer.end.y}
                    stroke='#fff7cf'
                    strokeLinecap='round'
                    strokeWidth='6'
                  />
                  <line
                    x1={avatarPointer.start.x}
                    y1={avatarPointer.start.y}
                    x2={avatarPointer.end.x}
                    y2={avatarPointer.end.y}
                    markerEnd={`url(#${pointerMarkerId})`}
                    stroke='#b45309'
                    strokeLinecap='round'
                    strokeWidth='3'
                  />
                </svg>
              ) : null}
              {!isAskModalMode && showAttachedAvatarShell ? (
                <motion.button
                  data-testid='kangur-ai-tutor-avatar'
                  data-anchor-kind={avatarAnchorKind}
                  data-avatar-placement='attached'
                  data-avatar-attachment-side={avatarAttachmentSide}
                  data-motion-preset={motionProfile.kind}
                  data-motion-behavior={prefersReducedMotion ? 'reduced' : 'animated'}
                  data-ui-mode={uiMode}
                  type='button'
                  onClick={(): void => handleCloseChat('toggle')}
                  whileHover={prefersReducedMotion ? undefined : { scale: motionProfile.hoverScale }}
                  whileTap={prefersReducedMotion ? undefined : { scale: motionProfile.tapScale }}
                  className={cn('absolute z-10', avatarButtonClassName)}
                  style={attachedAvatarStyle}
                  aria-label='Zamknij pomocnika'
                >
                  <TutorMoodAvatar
                    svgContent={tutorAvatarSvg}
                    avatarImageUrl={tutorAvatarImageUrl}
                    label={`${tutorName} avatar (${tutorMoodId})`}
                    className='h-12 w-12 border border-white/25 bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]'
                    svgClassName='[&_svg]:drop-shadow-[0_1px_1px_rgba(15,23,42,0.1)]'
                    data-testid='kangur-ai-tutor-avatar-image'
                  />
                </motion.button>
              ) : null}
              <KangurGlassPanel
                data-testid={isAskModalMode ? 'kangur-ai-tutor-ask-modal-surface' : undefined}
                surface='solid'
                variant='soft'
                className={cn(
                  'relative flex flex-col overflow-hidden border-2 border-slate-900 bg-[#fffdf4]/95 shadow-[0_24px_48px_-28px_rgba(15,23,42,0.16)]',
                  isAskModalMode ? 'pointer-events-auto w-full max-w-[min(92vw,560px)]' : null,
                  bubblePlacement.mode === 'sheet'
                    ? 'rounded-[28px] rounded-b-[24px]'
                    : 'rounded-[28px]'
                )}
                style={{
                  maxHeight: isAskModalMode
                    ? 'min(82vh, 720px)'
                    : bubblePlacement.mode === 'sheet'
                      ? 'min(76vh, 680px)'
                      : '70vh',
                }}
              >
                {!isAskModalMode && !avatarPointer && bubblePlacement.tailPlacement !== 'dock' ? (
                  <div
                    aria-hidden='true'
                    className={cn(
                      'absolute left-8 h-4 w-4 rotate-45 border-2 border-slate-900 bg-[#fffdf4]',
                      bubblePlacement.tailPlacement === 'top'
                        ? '-top-2 border-b-0 border-r-0'
                        : '-bottom-2 border-t-0 border-l-0'
                    )}
                  />
                ) : null}

                {!isAskModalMode && bubblePlacement.mode === 'sheet' ? (
                  <div className='flex justify-center bg-[#fffdf4]/98 px-3 pt-3'>
                    <div aria-hidden='true' className='h-1.5 w-14 rounded-full bg-slate-300' />
                  </div>
                ) : null}

                <div
                  data-testid='kangur-ai-tutor-header'
                  className={cn(
                    'flex items-center justify-between bg-gradient-to-r from-amber-300 via-orange-400 to-orange-500 px-4 py-3',
                    isAskModalMode ? 'pt-8' : null,
                    showAttachedAvatarShell && avatarAttachmentSide === 'left' ? 'pl-16' : null,
                    showAttachedAvatarShell && avatarAttachmentSide === 'right' ? 'pr-16' : null
                  )}
                >
                  <div className='min-w-0 flex flex-col'>
                    <span className='text-sm font-black uppercase tracking-[0.08em] text-white'>
                      {tutorName}
                    </span>
                    <span
                      data-testid='kangur-ai-tutor-mood-chip'
                      data-mood-id={tutorBehaviorMoodId}
                      className='mt-1 inline-flex w-fit items-center rounded-full border border-white/25 bg-white/16 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-white/95'
                    >
                        Nastroj: {tutorBehaviorMoodLabel}
                    </span>
                    <span
                      data-testid='kangur-ai-tutor-mood-description'
                      className='mt-1 text-[11px] leading-relaxed text-white/88'
                    >
                      {tutorBehaviorMoodDescription}
                    </span>
                    {sessionContext?.title || sessionContext?.contentId ? (
                      <span className='text-[11px] text-white/85'>
                        {sessionContext.surface === 'test'
                          ? 'Test'
                          : sessionContext.surface === 'game'
                            ? 'Gra'
                            : 'Lekcja'}
                          :{' '}
                        {sessionContext.title ?? sessionContext.contentId}
                      </span>
                    ) : null}
                  </div>
                  <div className='ml-3 flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => {
                        trackKangurClientEvent('kangur_ai_tutor_hidden', {
                          ...telemetryContext,
                          isOpen,
                          messageCount: messages.length,
                        });
                        setAskModalVisible(false);
                        askModalReturnStateRef.current = null;
                        setGuidedTutorTarget(null);
                        setGuestIntroVisible(false);
                        setGuestIntroHelpVisible(false);
                        setHomeOnboardingStepIndex(null);
                        setHasNewMessage(false);
                        clearSelection();
                        setHighlightedText(null);
                        setPersistedSelectionRect(null);
                        setPersistedSelectionContainerRect(null);
                        closeChat();
                        persistTutorVisibilityHidden(true);
                      }}
                      className='cursor-pointer rounded-full border border-white/28 bg-white/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-white/90 transition-colors hover:bg-white/18 hover:text-white'
                      aria-label='Wyłącz AI Tutora'
                    >
                      Wyłącz
                    </button>
                    <button
                      type='button'
                      onClick={(): void =>
                        isAskModalMode ? handleCloseAskModal('header') : handleCloseChat('header')
                      }
                      className='cursor-pointer text-white/80 transition-colors hover:text-white'
                      aria-label='Zamknij'
                    >
                      <X className='h-4 w-4' />
                    </button>
                  </div>
                </div>

                <div ref={tutorNarrationRootRef} className='flex min-h-0 flex-1 flex-col'>
                  {isAskModalMode ? (
                    <div
                      data-testid='kangur-ai-tutor-ask-modal-helper'
                      className='border-b border-slate-900/10 bg-[#fff7cf]/72 px-3 py-2 text-xs leading-relaxed text-slate-700'
                    >
                      {askModalHelperText}
                    </div>
                  ) : null}

                  <div className='border-b border-slate-900/10 bg-[#fff7cf]/80 px-3 py-3'>
                    {contextSwitchNotice ? (
                      <div
                        data-testid='kangur-ai-tutor-context-switch'
                        className='mb-3 rounded-[20px] border-2 border-slate-900 bg-white px-3 py-2 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.1)]'
                      >
                        <div className='text-[10px] font-black uppercase tracking-[0.16em] text-rose-600'>
                          {contextSwitchNotice.title}
                        </div>
                        <div className='mt-1 text-sm font-semibold text-slate-900'>
                          {contextSwitchNotice.target}
                        </div>
                        {contextSwitchNotice.detail ? (
                          <div className='mt-1 text-[11px] leading-relaxed text-slate-600'>
                            {contextSwitchNotice.detail}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <div className='flex flex-wrap items-start gap-2'>
                      {focusChipLabel ? (
                        <span
                          data-testid='kangur-ai-tutor-focus-chip'
                          className='rounded-full border border-slate-900 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-900'
                        >
                          {focusChipLabel}
                        </span>
                      ) : null}
                      {activeFocus.label && activeFocus.kind !== 'selection' ? (
                        <span className='rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700'>
                          {activeFocus.label}
                        </span>
                      ) : null}
                      {bridgeSummaryChipLabel ? (
                        <span
                          data-testid='kangur-ai-tutor-bridge-chip'
                          data-bridge-action-id={bridgeQuickAction?.id ?? 'none'}
                          className='rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-800'
                        >
                          {bridgeSummaryChipLabel}
                        </span>
                      ) : null}
                    </div>
                    {activeSelectedText ? (
                      <div
                        data-testid='kangur-ai-tutor-selected-text-preview'
                        className='mt-2 rounded-2xl border border-amber-200/80 bg-white/85 px-3 py-3 text-slate-700 shadow-[0_10px_24px_-18px_rgba(180,83,9,0.24)]'
                      >
                        <div className='flex items-start justify-between gap-3'>
                          <div className='min-w-0 flex-1'>
                            <div className='text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700'>
                            Wyjaśniany fragment
                            </div>
                            <div className='mt-2 text-xs italic leading-relaxed'>
                            „{selectedTextPreview}”
                              {activeSelectedText.length > (selectedTextPreview?.length ?? 0) ? '…' : ''}
                            </div>
                          </div>
                          {activeSelectionPageRect ? (
                            <KangurButton
                              data-testid='kangur-ai-tutor-selected-text-refocus'
                              type='button'
                              size='sm'
                              variant='surface'
                              className='h-8 shrink-0 px-3 text-[11px]'
                              onClick={handleFocusSelectedFragment}
                            >
                            Pokaż fragment
                            </KangurButton>
                          ) : null}
                          <KangurButton
                            data-testid='kangur-ai-tutor-selected-text-detach'
                            type='button'
                            size='sm'
                            variant='surface'
                            className='h-8 shrink-0 px-3 text-[11px]'
                            onClick={handleDetachSelectedFragment}
                          >
                          Wróć do rozmowy
                          </KangurButton>
                        </div>
                        <div className='mt-2 text-[11px] leading-relaxed text-slate-600'>
                        Możesz wrócić do zwykłej rozmowy albo ponownie pokazać fragment na stronie.
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div
                    className='flex flex-wrap gap-2 border-b border-slate-100 px-3 py-3'
                    data-kangur-tts-ignore='true'
                  >
                    {canNarrateTutorText ? (
                      <KangurNarratorControl
                        className='w-auto'
                        docId='kangur_ai_tutor_narrator'
                        engine={narratorSettings.engine}
                        pauseLabel='Pauza'
                        readLabel='Czytaj'
                        resumeLabel='Wznow'
                        script={tutorNarrationScript}
                        shellTestId='kangur-ai-tutor-narrator-shell'
                        voice={narratorSettings.voice}
                      />
                    ) : null}
                    {canStartHomeOnboardingManually ? (
                      <KangurButton
                        data-testid='kangur-ai-tutor-home-onboarding-replay'
                        type='button'
                        size='sm'
                        variant='surface'
                        className='h-9 px-3 text-xs'
                        onClick={handleStartHomeOnboarding}
                      >
                        {homeOnboardingReplayLabel}
                      </KangurButton>
                    ) : null}
                    {usageSummary && usageSummary.dailyMessageLimit !== null ? (
                      <div className='w-full rounded-2xl border border-amber-100 bg-amber-50/80 px-3 py-2 text-[11px] text-amber-900'>
                        <div className='flex items-center justify-between gap-3'>
                          <span className='font-semibold'>
                        Limit dzisiaj: {usageSummary.messageCount}/{usageSummary.dailyMessageLimit}
                          </span>
                          <span className='text-amber-700'>
                            {isUsageLoading
                              ? 'Aktualizuję…'
                              : remainingMessages === 0
                                ? 'Limit wyczerpany'
                                : `Pozostało ${remainingMessages}`}
                          </span>
                        </div>
                      </div>
                    ) : null}
                    {proactiveNudge ? (
                      <div
                        data-testid='kangur-ai-tutor-proactive-nudge'
                        data-nudge-mode={proactiveNudge.mode}
                        className={cn(
                          'w-full rounded-2xl border px-3 py-3 shadow-sm',
                          proactiveNudge.mode === 'coach'
                            ? 'border-sky-100 bg-sky-50/85'
                            : 'border-emerald-100 bg-emerald-50/85'
                        )}
                      >
                        <div className='text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500'>
                          {proactiveNudge.title}
                        </div>
                        <div className='mt-1 text-sm font-semibold text-slate-800'>
                          {proactiveNudge.action.label}
                        </div>
                        <div className='mt-1 text-xs leading-relaxed text-slate-600'>
                          {proactiveNudge.description}
                        </div>
                        <KangurButton
                          data-testid='kangur-ai-tutor-proactive-nudge-button'
                          type='button'
                          size='sm'
                          variant='surface'
                          className='mt-3 h-9 px-3 text-xs'
                          disabled={isLoading || !canSendMessages}
                          onClick={() =>
                            void handleQuickAction(proactiveNudge.action, {
                              source: 'proactive_nudge',
                            })}
                        >
                        Sprobuj teraz
                        </KangurButton>
                      </div>
                    ) : null}
                    {quickActions.map((action) => (
                      <KangurButton
                        key={action.id}
                        data-testid={`kangur-ai-tutor-quick-action-${action.id}`}
                        type='button'
                        size='sm'
                        variant='surface'
                        className='h-9 px-3 text-xs'
                        disabled={isLoading || !canSendMessages}
                        onClick={() => void handleQuickAction(action)}
                      >
                        {action.label}
                      </KangurButton>
                    ))}
                  </div>

                  <div className='flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3'>
                    {messages.length === 0 ? (
                      <p className='text-center text-xs text-slate-500 py-4'>
                        {isAskModalMode ? askModalHelperText : emptyStateMessage}
                      </p>
                    ) : (
                      messages.map((msg, index) => {
                        if (msg.role === 'user') {
                          return (
                            <div key={index} className='flex justify-end'>
                              <div className='max-w-[80%] rounded-[22px] border border-orange-400 bg-gradient-to-br from-orange-400 to-amber-500 px-3 py-2 text-sm leading-relaxed text-white shadow-[0_16px_28px_-20px_rgba(249,115,22,0.58)]'>
                                {msg.content}
                              </div>
                            </div>
                          );
                        }

                        const feedbackKey = getAssistantMessageFeedbackKey(tutorSessionKey, index, msg);
                        const submittedFeedback = messageFeedbackByKey[feedbackKey] ?? null;

                        return (
                          <div key={index} className='flex justify-start'>
                            <div className='w-full max-w-[90%] space-y-2'>
                              {msg.coachingFrame ? (
                                <div
                                  className='rounded-2xl border border-sky-100 bg-sky-50/80 px-3 py-2 text-left shadow-sm'
                                  data-testid='kangur-ai-tutor-coaching-frame'
                                  data-coaching-mode={msg.coachingFrame.mode}
                                >
                                  <div className='text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-600'>
                                    {msg.coachingFrame.label}
                                  </div>
                                  <div className='mt-1 text-xs font-medium leading-relaxed text-slate-700'>
                                    {msg.coachingFrame.description}
                                  </div>
                                  {msg.coachingFrame.rationale ? (
                                    <div className='mt-1 text-[11px] leading-relaxed text-slate-500'>
                                      {msg.coachingFrame.rationale}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                              <div className='rounded-[22px] border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800 shadow-sm'>
                                {msg.content}
                              </div>
                              {msg.followUpActions?.length ? (
                                <div className='space-y-2'>
                                  <div className='text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400'>
                                Kolejny krok
                                  </div>
                                  <div className='grid gap-2 sm:grid-cols-2'>
                                    {msg.followUpActions.map((action) => {
                                      const followUpHref = toFollowUpHref(basePath, action);

                                      return (
                                        <div
                                          key={action.id}
                                          className='rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-3'
                                        >
                                          {action.reason ? (
                                            <div className='text-xs font-medium leading-relaxed text-slate-700'>
                                              {action.reason}
                                            </div>
                                          ) : null}
                                          <div
                                            data-kangur-tts-ignore='true'
                                            className={cn(action.reason ? 'mt-2' : 'mt-0')}
                                          >
                                            <KangurButton
                                              asChild
                                              size='sm'
                                              variant='primary'
                                              className='w-full'
                                            >
                                              <Link
                                                href={followUpHref}
                                                onClick={() =>
                                                  handleFollowUpClick(action, index, followUpHref)}
                                                targetPageKey={action.page}
                                              >
                                                {action.label}
                                              </Link>
                                            </KangurButton>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : null}
                              {showSources && msg.sources?.length ? (
                                <div className='space-y-2'>
                                  <div className='text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400'>
                                Zrodla
                                  </div>
                                  {msg.sources.slice(0, 3).map((source) => (
                                    <div
                                      key={`${source.collectionId}-${source.documentId}`}
                                      className='rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-left shadow-sm'
                                    >
                                      <div className='text-[11px] font-semibold text-slate-700'>
                                        {source.metadata?.title?.trim() || `[doc:${source.documentId}]`}
                                      </div>
                                      <div className='mt-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-400'>
                                        {source.collectionId} · score {source.score.toFixed(3)}
                                      </div>
                                      {source.text?.trim() ? (
                                        <div className='mt-1 text-xs leading-relaxed text-slate-600'>
                                          {source.text.trim().slice(0, 180)}
                                          {source.text.trim().length > 180 ? '…' : ''}
                                        </div>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                              <div
                                data-testid={`kangur-ai-tutor-feedback-${index}`}
                                data-kangur-tts-ignore='true'
                                className='rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2'
                              >
                                <div className='flex flex-wrap items-center gap-2'>
                                  <span className='text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500'>
                                  Pomoglo?
                                  </span>
                                  <KangurButton
                                    data-testid={`kangur-ai-tutor-feedback-helpful-${index}`}
                                    type='button'
                                    size='sm'
                                    variant='surface'
                                    aria-pressed={submittedFeedback === 'helpful'}
                                    disabled={submittedFeedback !== null}
                                    className={cn(
                                      'h-8 px-3 text-[11px]',
                                      submittedFeedback === 'helpful'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : ''
                                    )}
                                    onClick={() => handleMessageFeedback(index, msg, 'helpful')}
                                  >
                                  Tak
                                  </KangurButton>
                                  <KangurButton
                                    data-testid={`kangur-ai-tutor-feedback-not-helpful-${index}`}
                                    type='button'
                                    size='sm'
                                    variant='surface'
                                    aria-pressed={submittedFeedback === 'not_helpful'}
                                    disabled={submittedFeedback !== null}
                                    className={cn(
                                      'h-8 px-3 text-[11px]',
                                      submittedFeedback === 'not_helpful'
                                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                                        : ''
                                    )}
                                    onClick={() => handleMessageFeedback(index, msg, 'not_helpful')}
                                  >
                                  Jeszcze nie
                                  </KangurButton>
                                </div>
                                {submittedFeedback ? (
                                  <div
                                    data-testid={`kangur-ai-tutor-feedback-status-${index}`}
                                    className='mt-2 text-[11px] leading-relaxed text-slate-500'
                                  >
                                    {submittedFeedback === 'helpful'
                                      ? 'Dzięki. To pomaga dopasować kolejne odpowiedzi tutora.'
                                      : 'Dzięki. Tutor spróbuje inaczej w kolejnej odpowiedzi.'}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {isLoading && (
                      <div className='flex justify-start'>
                        <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2'>
                          <span className='text-slate-400 text-xs animate-pulse'>Myślę…</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                <div className='border-t border-slate-100 px-3 py-3 flex gap-2 items-center'>
                  <KangurTextField
                    ref={inputRef}
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={handleKeyDown}
                    accent='amber'
                    size='sm'
                    className='flex-1'
                    disabled={isLoading || !canSendMessages}
                    placeholder={isAskModalMode ? 'Napisz pytanie do tutora' : inputPlaceholder}
                    aria-label='Wpisz pytanie'
                  />
                  <KangurButton
                    type='button'
                    size='sm'
                    variant='primary'
                    onClick={() => void handleSend()}
                    disabled={!inputValue.trim() || isLoading || !canSendMessages}
                    aria-label='Wyślij'
                  >
                    <Send className='h-3.5 w-3.5' />
                  </KangurButton>
                </div>
              </KangurGlassPanel>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
