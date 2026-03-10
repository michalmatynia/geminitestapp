'use client';

import { AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';

import { KANGUR_BASE_PATH } from '@/features/kangur/config/routing';
import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import {
  KANGUR_NARRATOR_SETTINGS_KEY,
  parseKangurNarratorSettings,
} from '@/features/kangur/settings';
import { resolveKangurAiTutorMotionPresetKind } from '@/features/kangur/settings-ai-tutor';
import { buildKangurLessonNarrationScriptFromText } from '@/features/kangur/tts/script';
import type {
  KangurTutorAnchorKind,
  KangurTutorAnchorRegistration,
} from '@/features/kangur/ui/context/kangur-tutor-types';
import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { useKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  selectBestTutorAnchor,
  useOptionalKangurTutorAnchors,
} from '@/features/kangur/ui/context/KangurTutorAnchorContext';
import { useKangurTextHighlight } from '@/features/kangur/ui/hooks/useKangurTextHighlight';
import type {
  KangurAiTutorConversationContext,
  KangurAiTutorFocusKind,
  KangurAiTutorLearnerMemory,
  KangurAiTutorMotionPresetKind,
  KangurAiTutorPromptMode,
} from '@/shared/contracts/kangur-ai-tutor';
import {
  formatKangurAiTutorTemplate,
  type KangurAiTutorContent,
} from '@/shared/contracts/kangur-ai-tutor-content';
import {
  useOptionalContextRegistryPageEnvelope,
  useRegisterContextRegistryPageSource,
} from '@/shared/lib/ai-context-registry/page-context';
import { buildContextRegistryConsumerEnvelope } from '@/shared/lib/ai-context-registry/page-context-shared';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { cn, getMotionSafeScrollBehavior } from '@/shared/utils';

import { KangurAiTutorComposer } from './KangurAiTutorComposer';
import { KangurAiTutorFloatingAvatar } from './KangurAiTutorFloatingAvatar';
import { KangurAiTutorGuestIntroPanel } from './KangurAiTutorGuestIntroPanel';
import { KangurAiTutorGuidedCallout } from './KangurAiTutorGuidedCallout';
import {
  formatGuidedArrowheadTransition,
  getAvatarRectFromPoint,
  getEstimatedBubbleHeight,
  getFloatingTutorArrowCorridorRect,
  getFloatingTutorArrowheadGeometry,
  getGuidedCalloutLayout,
  getMotionPositionPoint,
  getSelectionSpotlightStyle,
  resolveContinuousRotationDegrees,
} from './KangurAiTutorGuidedLayout';
import { KangurAiTutorMessageList } from './KangurAiTutorMessageList';
import { KangurAiTutorPanelAuxiliaryControls } from './KangurAiTutorPanelAuxiliaryControls';
import {
  KangurAiTutorPanelBodyProvider,
  type KangurAiTutorPanelBodyContextValue,
} from './KangurAiTutorPanelBody.context';
import { KangurAiTutorPanelChrome } from './KangurAiTutorPanelChrome';
import { KangurAiTutorPanelContextSummary } from './KangurAiTutorPanelContextSummary';
import { KangurAiTutorSelectionAction } from './KangurAiTutorSelectionAction';
import { KangurAiTutorSpotlightOverlays } from './KangurAiTutorSpotlightOverlays';
import { useKangurAiTutorAvatarDrag } from './KangurAiTutorWidget.avatar-drag';
import { useKangurAiTutorGuidedDisplayState } from './KangurAiTutorWidget.display';
import {
  useKangurAiTutorFocusTelemetryEffect,
  useKangurAiTutorGuidanceCompletionEffects,
  useKangurAiTutorNarrationObserverEffect,
  useKangurAiTutorSupplementalTelemetryEffects,
} from './KangurAiTutorWidget.effects';
import {
  useKangurAiTutorGuestIntroFlow,
  useKangurAiTutorGuidedAuthHandoffEffect,
  useKangurAiTutorHomeOnboardingFlow,
} from './KangurAiTutorWidget.entry';
import { useKangurAiTutorGuidedFlow } from './KangurAiTutorWidget.guided';
import {
  getPageRect,
  isAuthGuidedTutorTarget,
  isSectionExplainableTutorAnchor,
  isSectionGuidedTutorTarget,
} from './KangurAiTutorWidget.helpers';
import { useKangurAiTutorPanelInteractions } from './KangurAiTutorWidget.interactions';
import { useKangurAiTutorPanelActions } from './KangurAiTutorWidget.panel-actions';
import {
  ATTACHED_AVATAR_EDGE_INSET,
  ATTACHED_AVATAR_OVERLAP,
  ATTACHED_AVATAR_POINTER_EDGE_INSET,
  ATTACHED_AVATAR_POINTER_PADDING,
  AVATAR_SIZE,
  CTA_HEIGHT,
  CTA_WIDTH,
  DESKTOP_BUBBLE_WIDTH,
  EDGE_GAP,
  MOBILE_BUBBLE_WIDTH,
  PROTECTED_CONTENT_GAP,
  type ActiveTutorFocus,
  type TutorAvatarAttachmentSide,
  type TutorBubblePlacementStrategy,
  type TutorMotionPosition,
  type TutorMotionProfile,
  type TutorPointerSide,
  type TutorQuickAction,
} from './KangurAiTutorWidget.shared';
import {
  KangurAiTutorWidgetStateProvider,
  useKangurAiTutorWidgetState,
} from './KangurAiTutorWidget.state';
import {
  clearPersistedPendingTutorFollowUp,
  clearPersistedTutorAvatarPosition,
  clearPersistedTutorSessionKey,
  getGuestIntroPanelStyle,
  loadPersistedPendingTutorFollowUp,
  persistTutorAvatarPosition,
  persistTutorSessionKey,
  subscribeToTutorVisibilityChanges,
} from './KangurAiTutorWidget.storage';

import type {
  GuidedTutorAuthMode,
  GuidedTutorSectionKind,
  TutorPoint,
  TutorSurface,
} from './KangurAiTutorWidget.types';

const KANGUR_AI_TUTOR_NARRATOR_CONTEXT_ROOT_IDS = [
  'component:kangur-ai-tutor-narrator',
  'action:kangur-ai-tutor-tts',
] as const;

type TutorProactiveNudge = {
  mode: 'gentle' | 'coach';
  title: string;
  description: string;
  action: TutorQuickAction;
};

type TutorPointerGeometry = {
  left: number;
  top: number;
  width: number;
  height: number;
  side: TutorPointerSide;
  start: TutorPoint;
  end: TutorPoint;
};

const FOLLOW_UP_COMPLETION_MAX_AGE_MS = 30 * 60 * 1000;
const FLOATING_TUTOR_AVATAR_RIM_COLOR = '#78350f';
const SELECTION_PROTECTED_ZONE_PADDING_X = 140;
const SELECTION_PROTECTED_ZONE_PADDING_Y = 96;
const SELECTION_GUIDED_AVATAR_PADDING_X = 72;
const SELECTION_GUIDED_AVATAR_PADDING_Y = 56;
const SECTION_DROP_TARGET_PADDING_X = 18;
const SECTION_DROP_TARGET_PADDING_Y = 18;
const HOME_ONBOARDING_ELIGIBLE_CONTENT_ID = 'game:home';
const CONTEXTLESS_TUTOR_EMPTY_STATE_MESSAGE =
  'Otworz lekcje, gre albo test, a pomoge Ci w konkretnym zadaniu.';
const CONTEXTLESS_TUTOR_DISABLED_PLACEHOLDER =
  'Przejdz do lekcji, gry albo testu, aby zadac pytanie.';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

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

const getDockAvatarPoint = (viewport: { width: number; height: number }): TutorPoint => ({
  x: viewport.width - EDGE_GAP - AVATAR_SIZE,
  y: viewport.height - EDGE_GAP - AVATAR_SIZE,
});

const clampAvatarPoint = (
  point: TutorPoint,
  viewport: {
    width: number;
    height: number;
  }
): TutorPoint => ({
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
  createRect(
    getDockAvatarPoint(viewport).x,
    getDockAvatarPoint(viewport).y,
    AVATAR_SIZE,
    AVATAR_SIZE
  );

const getAnchorAvatarStyle = (rect: DOMRect): TutorMotionPosition => {
  const viewport = getViewport();
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
): { style: TutorMotionPosition; placement: 'top' | 'bottom' | 'left' | 'right' } => {
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

const getPanelCenterDistance = (panelRect: DOMRect, dockRect: DOMRect): number => {
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
      position: 'fixed',
      left: bestCandidate.left,
      top: bestCandidate.top,
    },
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
      top:
        bestCandidate?.top ??
        clamp(viewport.height - 440, EDGE_GAP, viewport.height - EDGE_GAP - 220),
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
  tutorContent: KangurAiTutorContent,
  focus: ActiveTutorFocus,
  selectedText: string | null,
  surface: TutorSurface | null | undefined
): string | null => {
  if (focus.kind === 'selection') {
    if (surface === 'test') {
      return selectedText
        ? tutorContent.focusChips.selection.testWithText
        : tutorContent.focusChips.selection.testWithoutText;
    }
    if (surface === 'game') {
      return selectedText
        ? tutorContent.focusChips.selection.gameWithText
        : tutorContent.focusChips.selection.gameWithoutText;
    }
    return selectedText
      ? tutorContent.focusChips.selection.lessonWithText
      : tutorContent.focusChips.selection.lessonWithoutText;
  }

  return focus.kind ? tutorContent.focusChips.kinds[focus.kind] ?? null : null;
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
  value: string,
  intentPhrases: {
    createAccount: string[];
    signIn: string[];
  }
): GuidedTutorAuthMode | null => {
  const normalized = normalizeTutorIntentText(value);
  if (!normalized) {
    return null;
  }

  if (
    intentPhrases.createAccount.some((phrase) =>
      normalized.includes(normalizeTutorIntentText(phrase))
    )
  ) {
    return 'create-account';
  }

  if (
    intentPhrases.signIn.some((phrase) => normalized.includes(normalizeTutorIntentText(phrase)))
  ) {
    return 'sign-in';
  }

  return null;
};

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
  const label = separatorIndex === -1 ? payload.trim() : payload.slice(0, separatorIndex).trim();
  const reason = separatorIndex === -1 ? null : payload.slice(separatorIndex + 1).trim() || null;

  return label ? { label, reason } : null;
};

const buildCompletedFollowUpBridgeQuickAction = (input: {
  tutorContent: KangurAiTutorContent;
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
    const bridgePrompt = formatKangurAiTutorTemplate(input.tutorContent.bridge.toGame.prompt, {
      title: lessonTitle ?? '',
    }).replace(/\s*:\s*\.$/, '.');
    return {
      id: 'bridge-to-game',
      label: input.tutorContent.bridge.toGame.label,
      prompt: bridgePrompt,
      promptMode: 'chat',
      interactionIntent: 'next_step',
    };
  }

  if (input.surface === 'game' && (!input.hasCurrentQuestion || input.answerRevealed)) {
    return {
      id: 'bridge-to-lesson',
      label: input.tutorContent.bridge.toLesson.label,
      prompt: input.tutorContent.bridge.toLesson.prompt,
      promptMode: 'chat',
      interactionIntent: 'next_step',
    };
  }

  return null;
};

const getBridgeSummaryChipLabel = (
  tutorContent: KangurAiTutorContent,
  bridgeQuickAction: TutorQuickAction | null
): string | null => {
  if (!bridgeQuickAction) {
    return null;
  }

  return bridgeQuickAction.id === 'bridge-to-game'
    ? tutorContent.bridge.toGame.summaryChip
    : bridgeQuickAction.id === 'bridge-to-lesson'
      ? tutorContent.bridge.toLesson.summaryChip
      : null;
};

const buildQuickActions = (input: {
  tutorContent: KangurAiTutorContent;
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
    tutorContent: input.tutorContent,
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
      label: input.hasCurrentQuestion
        ? input.tutorContent.quickActions.review.questionLabel
        : input.surface === 'game'
          ? input.tutorContent.quickActions.review.gameLabel
          : input.tutorContent.quickActions.review.resultLabel,
      prompt: input.hasCurrentQuestion
        ? input.tutorContent.quickActions.review.questionPrompt
        : input.surface === 'game'
          ? input.tutorContent.quickActions.review.gamePrompt
          : input.tutorContent.quickActions.review.resultPrompt,
      promptMode: 'explain',
      interactionIntent: 'review',
    });
    actions.push({
      id: 'next-step',
      label: input.hasCurrentQuestion
        ? input.tutorContent.quickActions.nextStep.reviewQuestionLabel
        : input.tutorContent.quickActions.nextStep.reviewOtherLabel,
      prompt: input.hasCurrentQuestion
        ? input.tutorContent.quickActions.nextStep.reviewQuestionPrompt
        : input.surface === 'game'
          ? input.tutorContent.quickActions.nextStep.reviewGamePrompt
          : input.tutorContent.quickActions.nextStep.reviewTestPrompt,
      promptMode: 'chat',
      interactionIntent: 'next_step',
    });
  } else if (isQuestionSurface) {
    if (input.lastAssistantCoachingMode === 'misconception_check') {
      actions.push({
        id: 'how-think',
        label: input.tutorContent.quickActions.howThink.misconceptionLabel,
        prompt: input.tutorContent.quickActions.howThink.misconceptionPrompt,
        promptMode: 'explain',
        interactionIntent: 'explain',
      });
      actions.push({
        id: 'hint',
        label: input.tutorContent.quickActions.hint.altLabel,
        prompt: input.tutorContent.quickActions.hint.altPrompt,
        promptMode: 'hint',
        interactionIntent: 'hint',
      });
    } else if (input.lastAssistantCoachingMode === 'hint_ladder') {
      actions.push({
        id: 'how-think',
        label: input.tutorContent.quickActions.howThink.ladderLabel,
        prompt: input.tutorContent.quickActions.howThink.ladderPrompt,
        promptMode: 'explain',
        interactionIntent: 'explain',
      });
      actions.push({
        id: 'hint',
        label: input.tutorContent.quickActions.hint.altLabel,
        prompt: input.tutorContent.quickActions.hint.altPrompt,
        promptMode: 'hint',
        interactionIntent: 'hint',
      });
    } else {
      actions.push({
        id: 'hint',
        label: input.tutorContent.quickActions.hint.defaultLabel,
        prompt: input.tutorContent.quickActions.hint.defaultPrompt,
        promptMode: 'hint',
        interactionIntent: 'hint',
      });
      actions.push({
        id: 'how-think',
        label: input.tutorContent.quickActions.howThink.defaultLabel,
        prompt: input.tutorContent.quickActions.howThink.defaultPrompt,
        promptMode: 'explain',
        interactionIntent: 'explain',
      });
    }
  } else {
    const explainAction: TutorQuickAction = {
      id: 'explain',
      label:
        input.focusKind === 'assignment' || input.hasAssignmentSummary
          ? input.tutorContent.quickActions.explain.assignmentLabel
          : input.tutorContent.quickActions.explain.defaultLabel,
      prompt: input.hasSelectedText
        ? input.tutorContent.quickActions.explain.selectedPrompt
        : input.tutorContent.quickActions.explain.defaultPrompt,
      promptMode: 'explain',
      interactionIntent: 'explain',
    };
    const nextStepAction: TutorQuickAction = {
      id: 'next-step',
      label:
        input.focusKind === 'assignment' || input.hasAssignmentSummary
          ? input.tutorContent.quickActions.nextStep.assignmentLabel
          : input.tutorContent.quickActions.nextStep.defaultLabel,
      prompt:
        input.focusKind === 'assignment' || input.hasAssignmentSummary
          ? input.surface === 'game'
            ? input.tutorContent.quickActions.nextStep.assignmentGamePrompt
            : input.tutorContent.quickActions.nextStep.assignmentLessonPrompt
          : input.surface === 'game'
            ? input.tutorContent.quickActions.nextStep.gamePrompt
            : input.tutorContent.quickActions.nextStep.defaultPrompt,
      promptMode: 'chat',
      interactionIntent: 'next_step',
    };
    const hintAction: TutorQuickAction = {
      id: 'hint',
      label: input.tutorContent.quickActions.hint.defaultLabel,
      prompt: input.tutorContent.quickActions.hint.defaultPrompt,
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
      label: input.tutorContent.quickActions.selectedText.label,
      prompt: input.tutorContent.quickActions.selectedText.prompt,
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
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
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
    input.proactiveNudges === 'coach'
      ? input.tutorContent.proactiveNudges.coachTitle
      : input.tutorContent.proactiveNudges.gentleTitle;
  const bridgeAction = pickQuickAction(input.quickActions, ['bridge-to-game', 'bridge-to-lesson']);

  if (input.hasSelectedText) {
    const action = pickQuickAction(input.quickActions, ['selected-text', 'explain']);
    return action
      ? {
        mode: input.proactiveNudges,
        title,
        description:
          input.proactiveNudges === 'coach'
            ? input.tutorContent.proactiveNudges.selectedTextCoach
            : input.tutorContent.proactiveNudges.selectedTextGentle,
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
            ? input.tutorContent.proactiveNudges.bridgeToGameCoach
            : input.tutorContent.proactiveNudges.bridgeToGameGentle
          : input.proactiveNudges === 'coach'
            ? input.tutorContent.proactiveNudges.bridgeToLessonCoach
            : input.tutorContent.proactiveNudges.bridgeToLessonGentle,
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
            ? input.tutorContent.proactiveNudges.reviewCoach
            : input.tutorContent.proactiveNudges.reviewGentle,
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
              ? input.tutorContent.proactiveNudges.stepByStepCoach
              : input.tutorContent.proactiveNudges.stepByStepGentle
            : input.proactiveNudges === 'coach'
              ? input.tutorContent.proactiveNudges.hintCoach
              : input.tutorContent.proactiveNudges.hintGentle,
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
            ? input.tutorContent.proactiveNudges.assignmentCoach
            : input.tutorContent.proactiveNudges.assignmentGentle,
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
          ? input.tutorContent.proactiveNudges.defaultCoach
          : input.tutorContent.proactiveNudges.defaultGentle,
      action,
    }
    : null;
};

const getEmptyStateMessage = (input: {
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
  surface: TutorSurface | null | undefined;
  answerRevealed: boolean | undefined;
  hasCurrentQuestion: boolean;
  hasAssignmentSummary: boolean;
  hasSelectedText: boolean;
  bridgeQuickAction: TutorQuickAction | null;
}): string => {
  if (input.hasSelectedText) {
    return input.tutorContent.emptyStates.selectedText;
  }

  if (
    (input.surface === 'test' || input.surface === 'game') &&
    !input.answerRevealed &&
    input.hasCurrentQuestion
  ) {
    return input.tutorContent.emptyStates.activeQuestion;
  }

  if (input.bridgeQuickAction?.id === 'bridge-to-game') {
    return input.tutorContent.emptyStates.bridgeToGame;
  }

  if (input.bridgeQuickAction?.id === 'bridge-to-lesson') {
    return input.tutorContent.emptyStates.bridgeToLesson;
  }

  if ((input.surface === 'test' || input.surface === 'game') && input.answerRevealed) {
    return input.hasCurrentQuestion
      ? input.tutorContent.emptyStates.reviewQuestion
      : input.surface === 'game'
        ? input.tutorContent.emptyStates.reviewGame
        : input.tutorContent.emptyStates.reviewTest;
  }

  if (input.hasAssignmentSummary) {
    return input.tutorContent.emptyStates.assignment;
  }

  if (input.surface === 'game') {
    return input.tutorContent.emptyStates.game;
  }

  return input.tutorContent.emptyStates.lesson;
};

const getInputPlaceholder = (input: {
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
  canSendMessages: boolean;
  surface: TutorSurface | null | undefined;
  answerRevealed: boolean | undefined;
  hasCurrentQuestion: boolean;
  hasAssignmentSummary: boolean;
  hasSelectedText: boolean;
  bridgeQuickAction: TutorQuickAction | null;
}): string => {
  if (!input.canSendMessages) {
    return input.tutorContent.placeholders.limitReached;
  }

  if (input.hasSelectedText) {
    return input.tutorContent.placeholders.selectedText;
  }

  if (
    (input.surface === 'test' || input.surface === 'game') &&
    !input.answerRevealed &&
    input.hasCurrentQuestion
  ) {
    return input.tutorContent.placeholders.activeQuestion;
  }

  if (input.bridgeQuickAction?.id === 'bridge-to-game') {
    return input.tutorContent.placeholders.bridgeToGame;
  }

  if (input.bridgeQuickAction?.id === 'bridge-to-lesson') {
    return input.tutorContent.placeholders.bridgeToLesson;
  }

  if ((input.surface === 'test' || input.surface === 'game') && input.answerRevealed) {
    return input.hasCurrentQuestion
      ? input.tutorContent.placeholders.reviewQuestion
      : input.surface === 'game'
        ? input.tutorContent.placeholders.reviewGame
        : input.tutorContent.placeholders.reviewTest;
  }

  if (input.hasAssignmentSummary) {
    return input.tutorContent.placeholders.assignment;
  }

  if (input.surface === 'game') {
    return input.tutorContent.placeholders.game;
  }

  return input.tutorContent.placeholders.lesson;
};

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
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
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
    input.surface === 'test'
      ? input.tutorContent.panelChrome.surfaceLabels.test
      : input.surface === 'game'
        ? input.tutorContent.panelChrome.surfaceLabels.game
        : input.tutorContent.panelChrome.surfaceLabels.lesson;
  const targetLabel = input.title?.trim()
    ? `${surfaceLabel}: ${input.title.trim()}`
    : input.contentId?.trim()
      ? `${surfaceLabel}: ${input.contentId.trim()}`
      : input.surface === 'test'
        ? input.tutorContent.panelChrome.contextFallbackTargets.test
        : input.surface === 'game'
          ? input.tutorContent.panelChrome.contextFallbackTargets.game
          : input.tutorContent.panelChrome.contextFallbackTargets.lesson;
  const detail = input.questionProgressLabel?.trim()
    ? input.questionProgressLabel.trim()
    : input.questionId?.trim()
      ? input.tutorContent.contextSwitch.detailCurrentQuestion
      : input.assignmentSummary?.trim()
        ? input.tutorContent.contextSwitch.detailCurrentAssignment
        : input.assignmentId?.trim()
          ? input.tutorContent.contextSwitch.detailCurrentAssignment
          : null;

  return {
    title: input.tutorContent.contextSwitch.title,
    target: targetLabel,
    detail,
  };
};

const getMotionPresetKind = (
  motionPresetId: string | null | undefined
): KangurAiTutorMotionPresetKind => {
  return resolveKangurAiTutorMotionPresetKind(motionPresetId);
};

const getTutorMotionProfile = (motionPresetId: string | null | undefined): TutorMotionProfile => {
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
  const tutorContent = useKangurAiTutorContent();
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
    highlightedText,
    usageSummary,
    learnerMemory,
    openChat,
    closeChat,
    sendMessage,
    recordFollowUpCompletion,
    setHighlightedText,
  } = tutorRuntime;
  const sessionContext = tutorRuntime.sessionContext;
  const pageContextRegistry = useOptionalContextRegistryPageEnvelope();
  const resolveGuestLoginGuidanceIntentForContent = useCallback(
    (value: string): GuidedTutorAuthMode | null =>
      resolveGuestLoginGuidanceIntent(value, tutorContent.guestIntro.intentPhrases),
    [tutorContent.guestIntro.intentPhrases]
  );
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
  const { selectedText, selectionRect, selectionContainerRect, clearSelection } =
    useKangurTextHighlight();
  const tutorAnchorContext = useOptionalKangurTutorAnchors();
  const routing = useOptionalKangurRouting();
  const widgetState = useKangurAiTutorWidgetState();
  const {
    askModalDockStyle,
    askModalReturnStateRef,
    askModalVisible,
    avatarDragStateRef,
    contextSwitchNotice,
    dismissedSelectedText,
    draggedAvatarPoint,
    guestIntroCheckStartedRef,
    guestIntroHelpVisible,
    guestIntroLocalSuppressionTrackedRef,
    guestIntroRecord,
    guestIntroShownForCurrentEntryRef,
    guestIntroVisible,
    guidedTutorTarget,
    highlightedSection,
    homeOnboardingRecord,
    homeOnboardingShownForCurrentEntryRef,
    homeOnboardingStepIndex,
    hoveredSectionAnchorId,
    inputRef,
    inputValue,
    isAvatarDragging,
    isTutorHidden,
    lastTrackedFocusKeyRef,
    lastTrackedProactiveNudgeKeyRef,
    lastTrackedQuotaKeyRef,
    launcherPromptVisible,
    messagesEndRef,
    mounted,
    motionTimeoutRef,
    panelAnchorMode,
    panelMeasuredHeight,
    panelRef,
    persistedSelectionContainerRect,
    persistedSelectionPageRect,
    persistedSelectionRect,
    previousSessionKeyRef,
    sectionResponseComplete,
    sectionResponseCompleteTimeoutRef,
    sectionResponsePending,
    selectionExplainTimeoutRef,
    selectionResponseComplete,
    selectionResponseCompleteTimeoutRef,
    selectionResponsePending,
    setAskModalDockStyle,
    setAskModalVisible,
    setContextSwitchNotice,
    setDismissedSelectedText,
    setDraggedAvatarPoint,
    setGuestIntroHelpVisible,
    setGuestIntroRecord,
    setGuestIntroVisible,
    setGuidedTutorTarget,
    setHasNewMessage,
    setHighlightedSection,
    setHomeOnboardingRecord,
    setHomeOnboardingStepIndex,
    setHoveredSectionAnchorId,
    setInputValue,
    setIsAvatarDragging,
    setIsTutorHidden,
    setLauncherPromptVisible,
    setMessageFeedbackByKey,
    setMounted,
    setPanelAnchorMode,
    setPanelMeasuredHeight,
    setPanelMotionState,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionRect,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionContextSpotlightTick,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    setTutorNarrationObservedText,
    setViewportTick,
    suppressAvatarClickRef,
    tutorNarrationObservedText,
    tutorNarrationRootRef,
    viewportTick,
  } = widgetState;
  const uiMode = tutorSettings?.uiMode ?? 'anchored';
  const isAnchoredUiMode = uiMode !== 'static';
  const allowCrossPagePersistence = tutorSettings?.allowCrossPagePersistence ?? true;
  const allowSelectedTextSupport = tutorSettings?.allowSelectedTextSupport ?? true;
  const showSources = tutorSettings?.showSources ?? true;
  const proactiveNudges = tutorSettings?.proactiveNudges ?? 'gentle';
  const hintDepth = tutorSettings?.hintDepth ?? 'guided';
  const guestTutorAssistantLabel = tutorName.trim() || 'Tutor';
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
  const rawSelectedText = allowSelectedTextSupport
    ? (selectedText ?? highlightedText)?.trim() || null
    : null;
  const activeSelectedText =
    rawSelectedText && rawSelectedText === dismissedSelectedText ? null : rawSelectedText;
  const liveSelectionPageRect = selectionRect ? getPageRect(selectionRect) : null;
  const activeSelectionRect = activeSelectedText
    ? (selectionRect ??
      getViewportRectFromPageRect(persistedSelectionPageRect) ??
      persistedSelectionRect)
    : null;
  const activeSelectionPageRect = activeSelectedText
    ? (liveSelectionPageRect ?? persistedSelectionPageRect)
    : null;
  const activeSelectionContainerRect = activeSelectedText
    ? (selectionContainerRect ?? persistedSelectionContainerRect)
    : null;
  const activeSelectionProtectedRect = activeSelectedText
    ? getSelectionProtectedRect(activeSelectionRect, activeSelectionContainerRect)
    : null;
  const highlightedSectionAnchor = useMemo(() => {
    if (!highlightedSection || !tutorAnchorContext) {
      return null;
    }

    return (
      tutorAnchorContext.anchors.find(
        (
          anchor
        ): anchor is KangurTutorAnchorRegistration & {
          kind: GuidedTutorSectionKind;
          surface: TutorSurface;
        } => anchor.id === highlightedSection.anchorId && isSectionExplainableTutorAnchor(anchor)
      ) ?? null
    );
  }, [highlightedSection, tutorAnchorContext]);
  const activeSectionRect = highlightedSectionAnchor?.getRect() ?? null;
  const activeSectionProtectedRect = highlightedSectionAnchor
    ? getExpandedRect(
      activeSectionRect,
      SECTION_DROP_TARGET_PADDING_X,
      SECTION_DROP_TARGET_PADDING_Y
    )
    : null;
  const remainingMessages = usageSummary?.remainingMessages ?? null;
  const isAuthenticatedVisitor = Boolean(
    mounted && authState && !authState.isLoadingAuth && authState.isAuthenticated
  );
  const shouldRenderContextlessTutorUi = Boolean(
    !isTutorHidden &&
      isAuthenticatedVisitor &&
      tutorSettings?.enabled &&
      !sessionContext &&
      authState?.user?.ownerEmailVerified !== false
  );
  const canSendMessages = remainingMessages !== 0 && !shouldRenderContextlessTutorUi;
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
    setHighlightedSection(null);
    setHoveredSectionAnchorId(null);
    setPersistedSelectionRect(null);
    setPersistedSelectionPageRect(null);
    setPersistedSelectionContainerRect(null);
    setSelectionResponsePending(null);
    setSelectionResponseComplete(null);
    setSectionResponsePending(null);
    setSectionResponseComplete(null);
    closeChat();
  }, [
    clearSelection,
    closeChat,
    isTutorHidden,
    setHighlightedSection,
    setHighlightedText,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionResponseComplete,
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
      const anchorRect =
        askModalHeader?.getBoundingClientRect() ?? askModalSurface?.getBoundingClientRect();
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
      setPanelAnchorMode('dock');
      setDismissedSelectedText(null);
      setPersistedSelectionRect(null);
      setPersistedSelectionPageRect(null);
      setPersistedSelectionContainerRect(null);
      setContextSwitchNotice(null);
    }
  }, [isOpen, setPanelAnchorMode]);

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
            tutorContent,
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
    tutorContent,
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
    if (Number.isNaN(createdAtMs) || Date.now() - createdAtMs > FOLLOW_UP_COMPLETION_MAX_AGE_MS) {
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

  const {
    canStartHomeOnboardingManually,
    guidedCalloutDetail,
    guidedCalloutHeaderLabel,
    guidedCalloutKey,
    sectionGuidanceLabel,
    guidedCalloutStepLabel,
    guidedCalloutTestId,
    guidedCalloutTitle,
    guidedFallbackRect,
    guidedMode,
    guidedSectionFocusRect,
    guidedSelectionPreview,
    guidedSelectionRect,
    guidedSelectionSpotlightRect,
    guidedTargetAnchor,
    homeOnboardingAnchor,
    homeOnboardingReplayLabel,
    homeOnboardingStep,
    homeOnboardingSteps,
    hoveredSectionAnchor,
    hoveredSectionProtectedRect,
    isAskModalMode,
    isEligibleForHomeOnboarding,
    isSectionGuidedTutorMode,
    isSelectionGuidedTutorMode,
    sectionResponsePendingKind,
    showSectionGuidanceCallout,
    showSelectionGuidanceCallout,
  } = useKangurAiTutorGuidedDisplayState({
    activeSectionRect,
    activeSelectionContainerRect,
    activeSelectionPageRect,
    activeSelectionRect,
    askModalVisible,
    enabled,
    guestTutorAssistantLabel,
    guidedTutorTarget,
    homeOnboardingEligibleContentId: HOME_ONBOARDING_ELIGIBLE_CONTENT_ID,
    homeOnboardingRecordStatus: homeOnboardingRecord?.status ?? null,
    homeOnboardingStepIndex,
    hoveredSectionAnchorId,
    isAuthenticated: authState?.isAuthenticated,
    isLoading,
    isOpen,
    isTutorHidden,
    mounted,
    persistedSelectionPageRect,
    persistedSelectionRect,
    sectionResponsePending,
    selectionResponsePending,
    sessionContentId: sessionContext?.contentId,
    sessionSurface: sessionContext?.surface,
    tutorAnchorContext,
    tutorContent,
    tutorName,
    viewportTick,
  });
  useKangurAiTutorGuidanceCompletionEffects({
    activeSelectedText,
    highlightedSection,
    isLoading,
    isOpen,
    isSectionGuidedMode: isSectionGuidedTutorMode,
    isSelectionGuidedMode: isSelectionGuidedTutorMode,
    sectionResponseComplete,
    sectionResponseCompleteTimeoutRef,
    sectionResponsePending,
    selectionResponseComplete,
    selectionResponseCompleteTimeoutRef,
    selectionResponsePending,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    telemetryContext,
  });

  useKangurAiTutorGuidedAuthHandoffEffect({
    guidedTutorTarget,
    loginModal: {
      authMode: loginModal.authMode,
      isOpen: loginModal.isOpen,
    },
    setGuidedTutorTarget,
  });

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

    if (highlightedSectionAnchor && highlightedSection) {
      return {
        rect: highlightedSectionAnchor.getRect(),
        kind: highlightedSection.kind,
        id: highlightedSection.anchorId,
        label: highlightedSection.label,
        assignmentId: highlightedSection.assignmentId,
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
  }, [
    activeSelectedText,
    activeSelectionRect,
    highlightedSection,
    highlightedSectionAnchor,
    registeredAnchor,
    viewportTick,
  ]);

  const focusChipLabel = getFocusChipLabel(
    tutorContent,
    activeFocus,
    activeSelectedText,
    sessionContext?.surface
  );
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
    !highlightedSection &&
    Boolean(selectedText && selectionRect && selectionActionStyle) &&
    !isSelectionWithinTutorUi();
  const isStaticUiMode = uiMode === 'static';
  const isContextualPanelAnchor = panelAnchorMode === 'contextual' && !isStaticUiMode;
  const displayFocusRect = isAnchoredUiMode && isContextualPanelAnchor ? activeFocus.rect : null;
  const isMobileSheet = viewport.width < motionProfile.sheetBreakpoint;
  const lastAssistantCoachingMode = getLastAssistantCoachingMode(messages);
  const quickActions = buildQuickActions({
    tutorContent,
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
  const bridgeSummaryChipLabel = getBridgeSummaryChipLabel(tutorContent, bridgeQuickAction);
  const proactiveNudge = buildProactiveNudge({
    tutorContent,
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
  const isSelectionExplainPendingMode = Boolean(
    selectionResponsePending && isOpen && !isAskModalMode
  );
  const isSectionExplainPendingMode = Boolean(sectionResponsePending && isOpen && !isAskModalMode);
  const showSelectionExplainCompleteState = Boolean(
    activeSelectedText &&
    selectionResponseComplete?.selectedText === activeSelectedText &&
    !isSelectionExplainPendingMode
  );
  const showSectionExplainCompleteState = Boolean(
    highlightedSection &&
      sectionResponseComplete?.anchorId === highlightedSection.anchorId &&
      !isSectionExplainPendingMode
  );
  const visibleQuickActions =
    shouldRenderContextlessTutorUi || isSelectionExplainPendingMode || isSectionExplainPendingMode
      ? []
      : quickActions;
  const visibleProactiveNudge =
    shouldRenderContextlessTutorUi || isSelectionExplainPendingMode || isSectionExplainPendingMode
      ? null
      : proactiveNudge;
  const activeProtectedContentRects = [
    ...(activeSelectionProtectedRect ? [activeSelectionProtectedRect] : []),
    ...(activeSectionProtectedRect ? [activeSectionProtectedRect] : []),
  ];
  const estimatedBubbleHeight = isMobileSheet
    ? undefined
    : Math.max(
      panelMeasuredHeight ?? 0,
      getEstimatedBubbleHeight(
        viewport,
        (visibleProactiveNudge ? 108 : 0) + (visibleQuickActions.length > 2 ? 24 : 0)
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
      protectedRects: activeProtectedContentRects,
    }
  );
  const guidedFocusRect =
    guidedMode === 'home_onboarding'
      ? (homeOnboardingAnchor?.getRect() ?? null)
      : showSectionGuidanceCallout
        ? guidedSectionFocusRect
        : showSelectionGuidanceCallout
          ? guidedSelectionRect
          : (guidedTargetAnchor?.getRect() ?? guidedFallbackRect);
  const guidedAvatarSelectionProtectedRect =
    guidedMode === 'selection'
      ? getExpandedRect(
        guidedFocusRect,
        SELECTION_GUIDED_AVATAR_PADDING_X,
        SELECTION_GUIDED_AVATAR_PADDING_Y
      )
      : null;
  const guidedAvatarLayout =
    guidedMode === 'selection' && guidedAvatarSelectionProtectedRect
      ? getGuidedAvatarLayout(guidedAvatarSelectionProtectedRect, viewport)
      : guidedFocusRect
        ? { placement: 'top' as const, style: getAnchorAvatarStyle(guidedFocusRect) }
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
    () => formatGuidedArrowheadTransition(motionProfile, Boolean(prefersReducedMotion)),
    [motionProfile, prefersReducedMotion]
  );
  const guidedAvatarArrowheadDisplayAngle =
    guidedAvatarArrowheadRenderAngle ?? guidedAvatarArrowhead?.angle ?? null;
  const guidedAvatarArrowheadDisplayAngleLabel =
    guidedAvatarArrowheadDisplayAngle !== null
      ? guidedAvatarArrowheadDisplayAngle.toFixed(2)
      : undefined;
  const guidedAvatarRect =
    guidedMode === 'selection' && guidedAvatarPoint
      ? getAvatarRectFromPoint(guidedAvatarPoint)
      : null;
  const guidedAvatarArrowCorridorRect =
    guidedMode === 'selection'
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
  const shouldEnableTutorNarration = isOpen && !isGuidedTutorMode && !shouldRenderGuestIntroUi;
  const emptyStateMessage = shouldRenderContextlessTutorUi
    ? CONTEXTLESS_TUTOR_EMPTY_STATE_MESSAGE
    : getEmptyStateMessage({
      tutorContent,
      surface: sessionContext?.surface,
      answerRevealed: sessionContext?.answerRevealed,
      hasCurrentQuestion,
      hasAssignmentSummary,
      hasSelectedText: Boolean(activeSelectedText),
      bridgeQuickAction,
    });
  const panelEmptyStateMessage = isSelectionExplainPendingMode
    ? tutorContent.emptyStates.selectionPending
    : isSectionExplainPendingMode
      ? tutorContent.emptyStates.sectionPending
      : emptyStateMessage;
  const askModalHelperText = isAuthGuidedTutorTarget(guidedTutorTarget)
    ? tutorContent.askModal.helperAuth
    : tutorContent.askModal.helperDefault;
  const selectedTextPreview = activeSelectedText?.slice(0, 140) ?? null;
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
      pushPart(tutorContent.panelContext.selectedTitle);
      pushPart(activeSelectedText);
      pushPart(
        showSelectionExplainCompleteState
          ? tutorContent.panelContext.selectedCompleteDetail
          : tutorContent.panelContext.selectedDefaultDetail
      );
    }

    if (highlightedSection) {
      pushPart(tutorContent.panelContext.sectionTitle);
      pushPart(highlightedSection.label ?? highlightedSection.kind);
      pushPart(
        isSectionExplainPendingMode
          ? tutorContent.panelContext.sectionPendingDetail
          : showSectionExplainCompleteState
            ? tutorContent.panelContext.sectionCompleteDetail
            : tutorContent.panelContext.sectionDefaultDetail
      );
    }

    if (isSelectionExplainPendingMode) {
      pushPart(tutorContent.panelContext.selectedPendingStatus);
    } else if (isSectionExplainPendingMode) {
      pushPart(tutorContent.panelContext.sectionPendingStatus);
    } else if (visibleProactiveNudge) {
      pushPart(visibleProactiveNudge.title);
      pushPart(visibleProactiveNudge.description);
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
    highlightedSection,
    isAskModalMode,
    isSectionExplainPendingMode,
    isSelectionExplainPendingMode,
    messages,
    showSectionExplainCompleteState,
    showSelectionExplainCompleteState,
    showSources,
    visibleProactiveNudge,
  ]);
  const tutorNarrationText =
    tutorNarrationObservedText.trim().length > 0
      ? tutorNarrationObservedText
      : tutorNarrationFallbackText;
  const tutorNarrationScript = useMemo(
    () =>
      buildKangurLessonNarrationScriptFromText({
        lessonId: tutorNarrationScriptId,
        title: isAskModalMode
          ? `${tutorName} - ${tutorContent.narrator.helpTitleSuffix}`
          : `${tutorName} - ${tutorContent.narrator.chatTitleSuffix}`,
        description: sessionContext?.title ?? null,
        text: tutorNarrationText,
        locale: 'pl-PL',
      }),
    [
      isAskModalMode,
      sessionContext?.title,
      tutorContent.narrator.chatTitleSuffix,
      tutorContent.narrator.helpTitleSuffix,
      tutorName,
      tutorNarrationText,
      tutorNarrationScriptId,
    ]
  );
  const canNarrateTutorText = tutorNarrationText.trim().length > 0;
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
  const showAttachedAvatarShell =
    !isTutorHidden && isOpen && isAnchoredUiMode && !isGuidedTutorMode && !isAskModalMode;
  const isCompactDockedTutorPanel =
    !isAskModalMode &&
    bubblePlacement.mode === 'bubble' &&
    bubblePlacement.launchOrigin === 'dock-bottom-right' &&
    messages.length === 0 &&
    !activeSelectedText &&
    !highlightedSection &&
    !contextSwitchNotice;
  const compactDockedTutorPanelWidth = Math.min(Math.max(viewport.width - 24, 280), 360);
  const shouldRenderAuxiliaryPanelControls =
    canStartHomeOnboardingManually ||
    Boolean(visibleProactiveNudge) ||
    (!isCompactDockedTutorPanel &&
      (canNarrateTutorText ||
        canStartHomeOnboardingManually ||
        Boolean(usageSummary && usageSummary.dailyMessageLimit !== null)));
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
        : isOpen && isAnchoredUiMode && isContextualPanelAnchor
          ? (activeFocus.kind ?? 'dock')
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
    bubblePlacement.mode === 'sheet' ? 'sheet' : isStaticUiMode ? 'fade' : 'dock-launch';
  const panelTransition = prefersReducedMotion
    ? reducedMotionTransitions.instant
    : panelOpenAnimation === 'fade'
      ? { duration: 0.2, ease: 'easeOut' as const }
      : motionProfile.bubbleTransition;
  const sessionSurfaceLabel =
    !isCompactDockedTutorPanel && (sessionContext?.title || sessionContext?.contentId)
      ? `${
        sessionContext?.surface === 'test'
          ? tutorContent.panelChrome.surfaceLabels.test
          : sessionContext?.surface === 'game'
            ? tutorContent.panelChrome.surfaceLabels.game
            : tutorContent.panelChrome.surfaceLabels.lesson
      }: ${sessionContext?.title ?? sessionContext?.contentId}`
      : null;
  const focusTelemetryKey = useMemo(
    () => (isOpen ? getFocusTelemetryKey(tutorSessionKey, activeFocus) : null),
    [activeFocus, isOpen, tutorSessionKey]
  );
  const proactiveNudgeTelemetryKey = useMemo(() => {
    if (!isOpen || !visibleProactiveNudge) {
      return null;
    }

    const contextKey =
      tutorSessionKey ??
      [
        sessionContext?.surface ?? 'unknown',
        sessionContext?.contentId ?? sessionContext?.title ?? 'none',
        activeFocus.id ?? activeFocus.kind ?? 'focus',
      ].join(':');

    return `${contextKey}:${visibleProactiveNudge.mode}:${visibleProactiveNudge.action.id}`;
  }, [
    activeFocus.id,
    activeFocus.kind,
    isOpen,
    sessionContext?.contentId,
    sessionContext?.surface,
    sessionContext?.title,
    tutorSessionKey,
    visibleProactiveNudge,
  ]);
  const quotaExhaustedTelemetryKey = useMemo(
    () =>
      usageSummary &&
      usageSummary.dailyMessageLimit !== null &&
      usageSummary.remainingMessages === 0
        ? `${usageSummary.dateKey}:${usageSummary.messageCount}:${usageSummary.dailyMessageLimit}`
        : null,
    [usageSummary]
  );
  const inputPlaceholder = shouldRenderContextlessTutorUi
    ? CONTEXTLESS_TUTOR_DISABLED_PLACEHOLDER
    : getInputPlaceholder({
      tutorContent,
      canSendMessages,
      surface: sessionContext?.surface,
      answerRevealed: sessionContext?.answerRevealed,
      hasCurrentQuestion,
      hasAssignmentSummary,
      hasSelectedText: Boolean(activeSelectedText),
      bridgeQuickAction,
    });
  const narrationObservationKey = [
    askModalHelperText,
    sessionContext?.contentId ?? 'none',
    sessionContext?.surface ?? 'none',
  ].join(':');
  useKangurAiTutorSupplementalTelemetryEffects({
    activeSelectedText,
    bridgeQuickActionId: bridgeQuickAction?.id ?? null,
    hintDepth,
    lastTrackedProactiveNudgeKeyRef,
    lastTrackedQuotaKeyRef,
    proactiveNudgeTelemetryKey,
    proactiveNudges,
    quotaExhaustedTelemetryKey,
    sessionContext: {
      surface: sessionContext?.surface,
      contentId: sessionContext?.contentId,
      title: sessionContext?.title,
    },
    telemetryContext,
    usageSummary,
    visibleProactiveNudge,
  });
  useKangurAiTutorNarrationObserverEffect({
    observationKey: narrationObservationKey,
    setTutorNarrationObservedText,
    shouldEnableTutorNarration,
    tutorNarrationRootRef,
  });
  const avatarButtonClassName = cn(
    'flex h-14 w-14 cursor-pointer items-center justify-center rounded-full',
    'border-2 border-amber-900 bg-gradient-to-br from-amber-300 via-orange-400 to-orange-500',
    'shadow-[0_14px_28px_-16px_rgba(154,82,24,0.26)] hover:brightness-[1.03]',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2'
  );
  const avatarButtonStyle: CSSProperties = {
    borderColor: FLOATING_TUTOR_AVATAR_RIM_COLOR,
  };
  useKangurAiTutorFocusTelemetryEffect({
    activeFocus,
    activeSelectedText,
    bubbleMode: bubblePlacement.mode,
    focusTelemetryKey,
    isOpen,
    lastTrackedFocusKeyRef,
    motionProfile,
    motionTimeoutRef,
    prefersReducedMotion: prefersReducedMotion ?? false,
    sessionContext: {
      surface: sessionContext?.surface,
      contentId: sessionContext?.contentId,
      title: sessionContext?.title,
    },
    setPanelMotionState,
  });

  const {
    handleAvatarMouseDown,
    handleCloseChat,
    handleCloseGuestIntroCard,
    handleCloseLauncherPrompt,
    handleDisableTutor,
    handleOpenChat,
    handlePanelBackdropClose,
    handlePanelHeaderClose,
    handleSelectionActionMouseDown,
    persistSelectionContext,
  } = useKangurAiTutorPanelInteractions({
    activeFocusKind: activeFocus.kind,
    activeSelectedText,
    allowSelectedTextSupport,
    bubblePlacementMode: bubblePlacement.mode,
    clearSelection,
    closeChat,
    isAskModalMode,
    isOpen,
    isTargetWithinTutorUi,
    messageCount: messages.length,
    openChat,
    persistSelectionGeometry,
    selectedText,
    selectionRect,
    setHighlightedText,
    setInputValue,
    telemetryContext,
    widgetState: {
      askModalReturnStateRef,
      avatarDragStateRef,
      setAskModalDockStyle,
      setAskModalVisible,
      setDraggedAvatarPoint,
      setGuestIntroHelpVisible,
      setGuestIntroVisible,
      setGuidedTutorTarget,
      setHasNewMessage,
      setHomeOnboardingStepIndex,
      setHoveredSectionAnchorId,
      setIsAvatarDragging,
      setLauncherPromptVisible,
      setPanelAnchorMode,
      setPersistedSelectionContainerRect,
      setPersistedSelectionPageRect,
      setPersistedSelectionRect,
      setSelectionResponseComplete,
      setSelectionResponsePending,
      suppressAvatarClickRef,
    },
  });

  const {
    handleGuestIntroAccept,
    handleGuestIntroCreateAccount,
    handleGuestIntroDismiss,
    handleGuestIntroHelpClose,
    handleGuestIntroLogin,
    startGuidedGuestLogin,
  } = useKangurAiTutorGuestIntroFlow({
    authState,
    enabled,
    guestIntroCheckStartedRef,
    guestIntroHelpVisible,
    guestIntroLocalSuppressionTrackedRef,
    guestIntroRecord,
    guestIntroShownForCurrentEntryRef,
    guestIntroVisible,
    handleCloseChat,
    handleOpenChat,
    isOpen,
    isTutorHidden,
    mounted,
    selectionExplainTimeoutRef,
    setGuidedTutorTarget,
    setGuestIntroHelpVisible,
    setGuestIntroRecord,
    setGuestIntroVisible,
    setHasNewMessage,
    shouldRepeatGuestIntroOnEntry,
    suppressAvatarClickRef,
  });

  const {
    focusSectionRect,
    focusSelectionPageRect,
    startGuidedSectionExplanation,
    startGuidedSelectionExplanation,
  } = useKangurAiTutorGuidedFlow({
    activeSelectionPageRect,
    clearSelection,
    handleOpenChat,
    motionProfile,
    prefersReducedMotion: Boolean(prefersReducedMotion),
    selectionExplainTimeoutRef,
    sendMessage,
    setDismissedSelectedText,
    setGuidedTutorTarget,
    setHasNewMessage,
    setHighlightedSection,
    setHighlightedText,
    setHoveredSectionAnchorId,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionRect,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionContextSpotlightTick,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    setViewportTick,
    suppressAvatarClickRef,
    telemetryContext,
    tutorContent,
    viewportHeight: viewport.height,
  });

  const {
    handleHomeOnboardingAdvance,
    handleHomeOnboardingBack,
    handleHomeOnboardingFinishEarly,
    handleStartHomeOnboarding,
  } = useKangurAiTutorHomeOnboardingFlow({
    canStartHomeOnboardingManually,
    closeChat,
    guidedTutorTarget,
    homeOnboardingEligibleContentId: HOME_ONBOARDING_ELIGIBLE_CONTENT_ID,
    homeOnboardingMode,
    homeOnboardingRecord,
    homeOnboardingShownForCurrentEntryRef,
    homeOnboardingStep,
    homeOnboardingStepIndex,
    homeOnboardingStepsLength: homeOnboardingSteps.length,
    isEligibleForHomeOnboarding,
    sessionContentId: sessionContext?.contentId,
    setDraggedAvatarPoint,
    setHomeOnboardingRecord,
    setHomeOnboardingStepIndex,
    shouldRepeatHomeOnboardingOnEntry,
  });

  const handleAskAbout = useCallback((): void => {
    const persistedSelectedText = persistSelectionContext();
    if (!persistedSelectedText) {
      return;
    }

    startGuidedSelectionExplanation(persistedSelectedText);
  }, [persistSelectionContext, startGuidedSelectionExplanation]);

  const handleAvatarClick = useCallback((): void => {
    if (suppressAvatarClickRef.current) {
      suppressAvatarClickRef.current = false;
      return;
    }

    if (homeOnboardingStepIndex !== null) {
      handleHomeOnboardingFinishEarly();
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
      setSelectionResponsePending(null);
      setSelectionResponseComplete(null);
      setSectionResponsePending(null);
      setSectionResponseComplete(null);
      if (isSectionGuidedTutorTarget(guidedTutorTarget)) {
        setHighlightedSection(null);
        setHoveredSectionAnchorId(null);
      }
      setGuidedTutorTarget(null);
      if (!isOpen) {
        handleOpenChat('toggle');
      }
      return;
    }

    if (isOpen) {
      handleCloseChat('toggle');
      return;
    }

    handleOpenChat('toggle');
  }, [
    guestIntroHelpVisible,
    guestIntroVisible,
    guidedTutorTarget,
    handleCloseGuestIntroCard,
    handleCloseChat,
    handleHomeOnboardingFinishEarly,
    handleCloseLauncherPrompt,
    handleOpenChat,
    homeOnboardingStepIndex,
    isOpen,
    launcherPromptVisible,
    setHighlightedSection,
    setHoveredSectionAnchorId,
  ]);

  const {
    handleFloatingAvatarPointerCancel,
    handleFloatingAvatarPointerDown,
    handleFloatingAvatarPointerMove,
    handleFloatingAvatarPointerUp,
  } = useKangurAiTutorAvatarDrag({
    avatarDragStateRef,
    avatarStyle,
    draggedAvatarPoint,
    guidedTutorTarget,
    homeOnboardingStepIndex,
    hoveredSectionAnchor,
    isOpen,
    selectionExplainTimeoutRef,
    setDraggedAvatarPoint,
    setGuidedTutorTarget,
    setHomeOnboardingStepIndex,
    setHoveredSectionAnchorId,
    setIsAvatarDragging,
    startGuidedSectionExplanation,
    suppressAvatarClickRef,
    tutorAnchorContext,
    viewport,
  });

  const {
    handleDetachHighlightedSection,
    handleDetachSelectedFragment,
    handleFocusHighlightedSection,
    handleFocusSelectedFragment,
    handleFollowUpClick,
    handleKeyDown,
    handleMessageFeedback,
    handleQuickAction,
    handleSend,
  } = useKangurAiTutorPanelActions({
    activeFocus,
    activeSectionRect,
    activeSelectedText,
    activeSelectionPageRect,
    answerRevealed: sessionContext?.answerRevealed,
    bridgeQuickActionId: bridgeQuickAction?.id ?? null,
    canSendMessages,
    clearSelection,
    focusSectionRect,
    focusSelectionPageRect,
    getCurrentTutorLocation,
    getInteractionIntent,
    highlightedSection,
    inputValue,
    isAnonymousVisitor,
    isLoading,
    messageCount: messages.length,
    normalizeConversationFocusKind,
    persistSelectionGeometry,
    resolveGuestLoginGuidanceIntent: resolveGuestLoginGuidanceIntentForContent,
    resolveTutorFollowUpLocation,
    setHighlightedText,
    sendMessage,
    startGuidedGuestLogin,
    telemetryContext,
    tutorSessionKey,
    widgetState: {
      setDismissedSelectedText,
      setHighlightedSection,
      setInputValue,
      setMessageFeedbackByKey,
      setPersistedSelectionContainerRect,
      setPersistedSelectionPageRect,
      setPersistedSelectionRect,
      setSectionResponseComplete,
      setSectionResponsePending,
      setSelectionResponseComplete,
    },
  });

  const handleCloseGuidedCallout = useCallback((): void => {
    if (guidedMode === 'home_onboarding') {
      handleHomeOnboardingFinishEarly();
      return;
    }

    if (selectionExplainTimeoutRef.current !== null) {
      window.clearTimeout(selectionExplainTimeoutRef.current);
      selectionExplainTimeoutRef.current = null;
    }

    if (guidedMode === 'section') {
      setHighlightedSection(null);
      setHoveredSectionAnchorId(null);
      setSectionResponsePending(null);
      setSectionResponseComplete(null);
    }

    setGuidedTutorTarget(null);
    setDraggedAvatarPoint(null);
    clearPersistedTutorAvatarPosition();
    closeChat();
  }, [
    closeChat,
    guidedMode,
    handleHomeOnboardingFinishEarly,
    setHighlightedSection,
    setHoveredSectionAnchorId,
  ]);

  if (
    (!enabled &&
      !shouldRenderGuestIntroUi &&
      !shouldRenderContextlessTutorUi &&
      !isGuidedTutorMode &&
      !askModalVisible &&
      !isAnonymousVisitor) ||
    !mounted
  ) {
    return null;
  }

  const guestIntroHeadline = guestIntroHelpVisible
    ? tutorContent.guestIntro.help.headline
    : tutorContent.guestIntro.initial.headline;
  const guestIntroDescription = guestIntroHelpVisible
    ? tutorContent.guestIntro.help.description
    : shouldRepeatGuestIntroOnEntry
      ? tutorContent.guestIntro.repeated.description
      : tutorContent.guestIntro.initial.description;
  const panelBodyContextValue: KangurAiTutorPanelBodyContextValue = {
    activeFocus,
    activeSectionRect,
    activeSelectedText,
    activeSelectionPageRect,
    askModalHelperText,
    basePath,
    bridgeQuickActionId: bridgeQuickAction?.id ?? null,
    bridgeSummaryChipLabel,
    canNarrateTutorText,
    canSendMessages,
    canStartHomeOnboardingManually,
    emptyStateMessage,
    focusChipLabel,
    handleDetachHighlightedSection,
    handleDetachSelectedFragment,
    handleFocusHighlightedSection,
    handleFocusSelectedFragment,
    handleFollowUpClick,
    handleKeyDown,
    handleMessageFeedback,
    handleQuickAction,
    handleSend,
    handleStartHomeOnboarding,
    homeOnboardingReplayLabel,
    inputPlaceholder,
    isAskModalMode,
    isLoading,
    isSectionExplainPendingMode,
    isSelectionExplainPendingMode,
    isUsageLoading,
    messages,
    narratorSettings,
    panelEmptyStateMessage,
    remainingMessages,
    selectedTextPreview,
    shouldRenderAuxiliaryPanelControls,
    showSectionExplainCompleteState,
    showSelectionExplainCompleteState,
    showSources,
    tutorNarrationScript,
    tutorNarratorContextRegistry,
    tutorSessionKey,
    usageSummary,
    visibleProactiveNudge,
    visibleQuickActions,
  };

  return createPortal(
    <KangurAiTutorWidgetStateProvider value={widgetState}>
      <>
        <AnimatePresence>
          <KangurAiTutorSelectionAction
            shouldRender={shouldRenderSelectionAction}
            placement={selectionActionLayout?.placement ?? 'top'}
            prefersReducedMotion={prefersReducedMotion ?? false}
            style={selectionActionStyle}
            onSelectionActionMouseDown={handleSelectionActionMouseDown}
            onAskAbout={handleAskAbout}
          />
        </AnimatePresence>

        <AnimatePresence>
          {shouldRenderGuestIntroUi ? (
            <KangurAiTutorGuestIntroPanel
              isAnonymousVisitor={isAnonymousVisitor}
              guestTutorLabel={guestTutorAssistantLabel}
              guestIntroHeadline={guestIntroHeadline}
              guestIntroDescription={guestIntroDescription}
              prefersReducedMotion={prefersReducedMotion ?? false}
              panelStyle={getGuestIntroPanelStyle(viewport)}
              onClose={handleCloseGuestIntroCard}
              onLogin={handleGuestIntroLogin}
              onCreateAccount={handleGuestIntroCreateAccount}
              onHelpClose={handleGuestIntroHelpClose}
              onAccept={handleGuestIntroAccept}
              onDismiss={handleGuestIntroDismiss}
            />
          ) : null}
        </AnimatePresence>

        <KangurAiTutorSpotlightOverlays
          guidedMode={guidedMode}
          prefersReducedMotion={prefersReducedMotion ?? false}
          reducedMotionTransitions={reducedMotionTransitions}
          sectionContextSpotlightStyle={sectionContextSpotlightStyle}
          sectionDropHighlightStyle={sectionDropHighlightStyle}
          selectionContextSpotlightStyle={selectionContextSpotlightStyle}
          selectionSpotlightStyle={selectionSpotlightStyle}
        />

        <KangurAiTutorGuidedCallout
          calloutKey={guidedCalloutKey}
          calloutTestId={guidedCalloutTestId}
          detail={guidedCalloutDetail}
          headerLabel={guidedCalloutHeaderLabel}
          mode={guidedMode}
          onAction={(action): void => {
            switch (action) {
              case 'advance_home_onboarding':
                handleHomeOnboardingAdvance();
                return;
              case 'finish_home_onboarding':
                handleHomeOnboardingFinishEarly();
                return;
              case 'back_home_onboarding':
                handleHomeOnboardingBack();
                return;
              case 'close':
                handleCloseGuidedCallout();
                return;
              default:
                return;
            }
          }}
          placement={guidedCalloutLayout?.placement ?? 'top'}
          prefersReducedMotion={prefersReducedMotion ?? false}
          reducedMotionTransitions={reducedMotionTransitions}
          sectionGuidanceLabel={sectionGuidanceLabel}
          sectionResponsePendingKind={sectionResponsePendingKind}
          selectionPreview={guidedSelectionPreview}
          shouldRender={shouldRenderGuidedCallout}
          showSectionGuidanceCallout={showSectionGuidanceCallout}
          showSelectionGuidanceCallout={showSelectionGuidanceCallout}
          stepLabel={guidedCalloutStepLabel}
          style={guidedCalloutStyle}
          title={guidedCalloutTitle}
          transitionDuration={guidedCalloutTransitionDuration}
          transitionEase={
            [...motionProfile.guidedAvatarTransition.ease] as [number, number, number, number]
          }
        />

        <KangurAiTutorFloatingAvatar
          ariaLabel={
            isOpen ? tutorContent.common.closeTutorAria : tutorContent.common.openTutorAria
          }
          avatarAnchorKind={avatarAnchorKind}
          avatarButtonClassName={avatarButtonClassName}
          avatarButtonStyle={avatarButtonStyle}
          avatarStyle={avatarStyle}
          floatingAvatarPlacement={floatingAvatarPlacement}
          guidedArrowheadTransition={guidedArrowheadTransition}
          guidedAvatarArrowhead={guidedAvatarArrowhead}
          guidedAvatarArrowheadDisplayAngle={guidedAvatarArrowheadDisplayAngle}
          guidedAvatarArrowheadDisplayAngleLabel={guidedAvatarArrowheadDisplayAngleLabel}
          guidedAvatarPlacement={guidedAvatarLayout?.placement ?? 'dock'}
          guidedTargetKind={
            guidedMode === 'home_onboarding'
              ? (homeOnboardingStep?.kind ?? 'none')
              : (guidedTutorTarget?.kind ?? 'none')
          }
          isAskModalMode={isAskModalMode}
          isGuidedTutorMode={isGuidedTutorMode}
          isOpen={isOpen}
          motionProfile={motionProfile}
          onClick={handleAvatarClick}
          onMouseDown={handleAvatarMouseDown}
          onPointerCancel={handleFloatingAvatarPointerCancel}
          onPointerDown={handleFloatingAvatarPointerDown}
          onPointerMove={handleFloatingAvatarPointerMove}
          onPointerUp={handleFloatingAvatarPointerUp}
          prefersReducedMotion={prefersReducedMotion ?? false}
          reducedMotionTransitions={reducedMotionTransitions}
          rimColor={FLOATING_TUTOR_AVATAR_RIM_COLOR}
          showFloatingAvatar={showFloatingAvatar}
          uiMode={uiMode}
        />

        <KangurAiTutorPanelChrome
          attachedAvatarStyle={attachedAvatarStyle}
          attachedLaunchOffset={attachedLaunchOffset}
          avatarAnchorKind={avatarAnchorKind}
          avatarAttachmentSide={avatarAttachmentSide}
          avatarButtonClassName={avatarButtonClassName}
          avatarPointer={avatarPointer}
          bubbleLaunchOrigin={bubblePlacement.launchOrigin}
          bubbleMode={bubblePlacement.mode}
          bubbleStrategy={bubblePlacement.strategy}
          bubbleStyle={bubblePlacement.style}
          bubbleTailPlacement={bubblePlacement.tailPlacement}
          bubbleWidth={bubblePlacement.width}
          compactDockedTutorPanelWidth={compactDockedTutorPanelWidth}
          isAskModalMode={isAskModalMode}
          isCompactDockedTutorPanel={isCompactDockedTutorPanel}
          isGuidedTutorMode={isGuidedTutorMode}
          isOpen={isOpen}
          isTutorHidden={isTutorHidden}
          motionProfile={motionProfile}
          panelAvatarPlacement={panelAvatarPlacement}
          panelEmptyStateMessage={panelEmptyStateMessage}
          panelOpenAnimation={panelOpenAnimation}
          panelTransition={panelTransition}
          pointerMarkerId={pointerMarkerId}
          prefersReducedMotion={prefersReducedMotion ?? false}
          reducedMotionTransitions={reducedMotionTransitions}
          sessionSurfaceLabel={sessionSurfaceLabel}
          shouldRenderGuestIntroUi={shouldRenderGuestIntroUi}
          showAttachedAvatarShell={showAttachedAvatarShell}
          uiMode={uiMode}
          onAttachedAvatarClick={() => handleCloseChat('toggle')}
          onBackdropClose={handlePanelBackdropClose}
          onClose={handlePanelHeaderClose}
          onDisableTutor={handleDisableTutor}
        >
          <KangurAiTutorPanelBodyProvider value={panelBodyContextValue}>
            <>
              <KangurAiTutorPanelContextSummary />
              <KangurAiTutorPanelAuxiliaryControls />
              <KangurAiTutorMessageList />
              <KangurAiTutorComposer />
            </>
          </KangurAiTutorPanelBodyProvider>
        </KangurAiTutorPanelChrome>
      </>
    </KangurAiTutorWidgetStateProvider>,
    document.body
  );
}
