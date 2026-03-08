'use client';

import { createPortal } from 'react-dom';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, Send, BrainCircuit } from 'lucide-react';

import { KANGUR_BASE_PATH } from '@/features/kangur/config/routing';
import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import { resolveKangurAiTutorMotionPresetKind } from '@/features/kangur/settings-ai-tutor';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  buildKangurRecommendationHref,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  selectBestTutorAnchor,
  useOptionalKangurTutorAnchors,
} from '@/features/kangur/ui/context/KangurTutorAnchorContext';
import type { KangurTutorAnchorKind } from '@/features/kangur/ui/context/kangur-tutor-types';
import {
  KangurButton,
  KangurGlassPanel,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import { useKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useKangurTextHighlight } from '@/features/kangur/ui/hooks/useKangurTextHighlight';
import type {
  KangurAiTutorConversationContext,
  KangurAiTutorFollowUpAction,
  KangurAiTutorPromptMode,
  KangurAiTutorSurface,
} from '@/shared/contracts/kangur-ai-tutor';
import { cn, getMotionSafeScrollBehavior, sanitizeSvg } from '@/shared/utils';

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
  KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY,
  MOBILE_BUBBLE_WIDTH,
  PROTECTED_CONTENT_GAP,
  type ActiveTutorFocus,
  type TutorAvatarAttachmentSide,
  type TutorBubblePlacementStrategy,
  type TutorMoodAvatarProps,
  type TutorMotionPosition,
  type TutorMotionProfile,
  type TutorMotionPresetKind,
  type TutorPointerSide,
  type TutorQuickAction,
} from './KangurAiTutorWidget.shared';

type TutorSurface = KangurAiTutorSurface;
type TutorPoint = {
  x: number;
  y: number;
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

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

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
      className={cn('flex items-center justify-center overflow-hidden rounded-full', className)}
      data-testid={dataTestId}
      role='img'
    >
      {hasImage ? (
        <img
          src={avatarImageUrl ?? undefined}
          alt={label}
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

const getViewport = (): { width: number; height: number } => {
  if (typeof window === 'undefined') {
    return { width: 1280, height: 720 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

const getDockAvatarStyle = (): TutorMotionPosition => ({
  left: `calc(100vw - ${EDGE_GAP + AVATAR_SIZE}px)`,
  top: `calc(100vh - ${EDGE_GAP + AVATAR_SIZE}px)`,
});

const getDockAvatarRect = (viewport: { width: number; height: number }): DOMRect =>
  createRect(
    viewport.width - EDGE_GAP - AVATAR_SIZE,
    viewport.height - EDGE_GAP - AVATAR_SIZE,
    AVATAR_SIZE,
    AVATAR_SIZE
  );

const loadPersistedTutorSessionKey = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { lastSessionKey?: unknown } | null;
    return typeof parsed?.lastSessionKey === 'string' ? parsed.lastSessionKey : null;
  } catch {
    return null;
  }
};

const persistTutorSessionKey = (sessionKey: string | null): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(
      KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY,
      JSON.stringify({ lastSessionKey: sessionKey })
    );
  } catch {
    // Ignore storage write failures so the widget remains functional without storage.
  }
};

const clearPersistedTutorSessionKey = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures so the widget remains functional without storage.
  }
};

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

const getEstimatedBubbleHeight = (viewport: { width: number; height: number }): number => {
  const maxHeight = Math.max(220, viewport.height - EDGE_GAP * 2);
  return clamp(Math.min(viewport.height * 0.58, BUBBLE_MAX_HEIGHT), Math.min(BUBBLE_MIN_HEIGHT, maxHeight), maxHeight);
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

const getSelectionActionStyle = (rect: DOMRect): CSSProperties => {
  const viewport = getViewport();
  const left = clamp(
    rect.left + rect.width / 2 - CTA_WIDTH / 2,
    EDGE_GAP,
    viewport.width - EDGE_GAP - CTA_WIDTH
  );
  const preferredTop = rect.top - CTA_HEIGHT - 12;
  const fallbackTop = rect.bottom + 10;
  const top = preferredTop >= EDGE_GAP
    ? preferredTop
    : clamp(fallbackTop, EDGE_GAP, viewport.height - EDGE_GAP - CTA_HEIGHT);

  return {
    position: 'fixed',
    left,
    top,
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

  const width = Math.min(
    viewport.width - EDGE_GAP * 2,
    viewport.width < 640 ? widthConfig.mobile : widthConfig.desktop
  );

  if (!rect) {
    return {
      mode,
      width,
      tailPlacement: 'dock',
      strategy: 'dock',
      launchOrigin: 'dock-bottom-right',
      style: {
        left: viewport.width - EDGE_GAP - width,
        top: clamp(viewport.height - 440, EDGE_GAP, viewport.height - EDGE_GAP - 220),
      },
    };
  }

  const estimatedHeight = getEstimatedBubbleHeight(viewport);
  const maxLeft = viewport.width - EDGE_GAP - width;
  const maxTop = viewport.height - EDGE_GAP - estimatedHeight;
  const protectedRects = options?.protectedRects?.filter(Boolean) ?? [];
  const protectedZone = getRectUnion([rect, ...protectedRects]) ?? rect;
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
        score,
      };
    })
    .sort((leftCandidate, rightCandidate) => leftCandidate.score - rightCandidate.score)[0];

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
  answerRevealed: boolean | undefined
): KangurTutorAnchorKind[] => {
  if (surface === 'lesson') {
    return ['assignment', 'lesson_header', 'document'];
  }

  if (surface === 'test') {
    return answerRevealed ? ['review', 'summary', 'question'] : ['question', 'review', 'summary'];
  }

  if (surface === 'game') {
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

const buildQuickActions = (input: {
  surface: TutorSurface | null | undefined;
  answerRevealed: boolean | undefined;
  hasSelectedText: boolean;
  hasCurrentQuestion: boolean;
  hasAssignmentSummary: boolean;
  focusKind: ActiveTutorFocus['kind'];
}): TutorQuickAction[] => {
  const actions: TutorQuickAction[] = [];
  const isQuestionSurface =
    input.surface === 'test' || (input.surface === 'game' && input.hasCurrentQuestion);
  const isReviewSurface =
    (input.surface === 'test' || input.surface === 'game') && input.answerRevealed;

  if (isReviewSurface) {
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
  } else {
    actions.push({
      id: 'hint',
      label: 'Podpowiedz',
      prompt: 'Daj mi małą podpowiedź, ale bez gotowej odpowiedzi.',
      promptMode: 'hint',
      interactionIntent: 'hint',
    });
    actions.push({
      id: 'explain',
      label:
        input.focusKind === 'assignment' || input.hasAssignmentSummary ? 'Wyjasnij temat' : 'Wyjasnij',
      prompt: input.hasSelectedText
        ? 'Wyjaśnij ten fragment prostymi słowami.'
        : 'Wyjaśnij mi to prostymi słowami.',
      promptMode: 'explain',
      interactionIntent: 'explain',
    });
    actions.push({
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
    });
  }

  if (input.hasSelectedText) {
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

const getEmptyStateMessage = (input: {
  surface: TutorSurface | null | undefined;
  answerRevealed: boolean | undefined;
  hasCurrentQuestion: boolean;
  hasAssignmentSummary: boolean;
  hasSelectedText: boolean;
}): string => {
  if (input.hasSelectedText) {
    return 'Masz zaznaczony fragment. Poproś o wyjaśnienie albo kolejny krok.';
  }

  if ((input.surface === 'test' || input.surface === 'game') && !input.answerRevealed && input.hasCurrentQuestion) {
    return 'Poproś o wskazówkę do tego pytania. Tutor nie poda gotowej odpowiedzi.';
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
): TutorMotionPresetKind => {
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
        bubbleTransition: { type: 'spring', stiffness: 300, damping: 28 },
        hoverScale: 1.06,
        tapScale: 0.94,
        motionCompletedDelayMs: 360,
        desktopBubbleWidth: DESKTOP_BUBBLE_WIDTH,
        mobileBubbleWidth: MOBILE_BUBBLE_WIDTH,
      };
  }
};

const getSelectionTelemetryKey = (
  text: string | null,
  rect: DOMRect | null
): string | null => {
  if (!text || !rect) {
    return null;
  }

  return [
    text.trim(),
    Math.round(rect.left),
    Math.round(rect.top),
    Math.round(rect.width),
    Math.round(rect.height),
  ].join(':');
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
    target.closest('[data-testid="kangur-ai-tutor-avatar"]') !== null ||
    target.closest('[data-testid="kangur-ai-tutor-selection-action"]') !== null
  );
};

export function KangurAiTutorWidget(): React.JSX.Element | null {
  const prefersReducedMotion = useReducedMotion();
  const tutorRuntime = useKangurAiTutor();
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
    openChat,
    closeChat,
    sendMessage,
    setHighlightedText,
  } = tutorRuntime;
  const tutorBehaviorMoodId = tutorRuntime.tutorBehaviorMoodId ?? 'neutral';
  const tutorBehaviorMoodLabel = tutorRuntime.tutorBehaviorMoodLabel ?? 'Neutralny';
  const tutorBehaviorMoodDescription =
    tutorRuntime.tutorBehaviorMoodDescription ??
    'Stabilny punkt wyjscia, gdy nie potrzeba silniejszego tonu.';
  const sessionContext = tutorRuntime.sessionContext;
  const { selectedText, selectionRect, selectionContainerRect, clearSelection } = useKangurTextHighlight();
  const tutorAnchorContext = useOptionalKangurTutorAnchors();
  const routing = useOptionalKangurRouting();
  const [mounted, setMounted] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [panelMotionState, setPanelMotionState] = useState<'animating' | 'settled'>('settled');
  const [persistedSelectionRect, setPersistedSelectionRect] = useState<DOMRect | null>(null);
  const [persistedSelectionContainerRect, setPersistedSelectionContainerRect] = useState<DOMRect | null>(null);
  const [contextSwitchNotice, setContextSwitchNotice] = useState<{
    title: string;
    target: string;
    detail: string | null;
  } | null>(null);
  const [viewportTick, setViewportTick] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const persistedSessionKey = useMemo(() => loadPersistedTutorSessionKey(), []);
  const previousSessionKeyRef = useRef<string | null>(persistedSessionKey);
  const lastShownSelectionKeyRef = useRef<string | null>(null);
  const lastTrackedFocusKeyRef = useRef<string | null>(null);
  const motionTimeoutRef = useRef<number | null>(null);
  const uiMode = tutorSettings?.uiMode ?? 'anchored';
  const isAnchoredUiMode = uiMode !== 'static';
  const allowCrossPagePersistence = tutorSettings?.allowCrossPagePersistence ?? true;
  const allowSelectedTextSupport = tutorSettings?.allowSelectedTextSupport ?? true;
  const showSources = tutorSettings?.showSources ?? true;
  const activeSelectedText = allowSelectedTextSupport
    ? (selectedText ?? highlightedText)?.trim() || null
    : null;
  const activeSelectionRect = activeSelectedText ? selectionRect ?? persistedSelectionRect : null;
  const activeSelectionContainerRect = activeSelectedText
    ? selectionContainerRect ?? persistedSelectionContainerRect
    : null;
  const remainingMessages = usageSummary?.remainingMessages ?? null;
  const canSendMessages = remainingMessages !== 0;
  const basePath = routing?.basePath ?? KANGUR_BASE_PATH;
  const telemetryContext = {
    surface: sessionContext?.surface ?? null,
    contentId: sessionContext?.contentId ?? null,
    title: sessionContext?.title ?? null,
  };
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
  const selectionTelemetryKey = useMemo(
    () =>
      getSelectionTelemetryKey(
        allowSelectedTextSupport && !isOpen ? selectedText : null,
        allowSelectedTextSupport && !isOpen ? selectionRect : null
      ),
    [allowSelectedTextSupport, isOpen, selectedText, selectionRect]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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
    if (!isOpen) {
      setPersistedSelectionRect(null);
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

  useEffect(() => {
    if (!selectionTelemetryKey) {
      lastShownSelectionKeyRef.current = null;
      return;
    }

    if (lastShownSelectionKeyRef.current === selectionTelemetryKey) {
      return;
    }

    lastShownSelectionKeyRef.current = selectionTelemetryKey;
    trackKangurClientEvent('kangur_ai_tutor_selection_cta_shown', {
      surface: sessionContext?.surface ?? null,
      contentId: sessionContext?.contentId ?? null,
      title: sessionContext?.title ?? null,
      selectionLength: selectedText?.trim().length ?? 0,
    });
  }, [
    selectionTelemetryKey,
    selectedText,
    sessionContext?.contentId,
    sessionContext?.surface,
    sessionContext?.title,
  ]);

  const anchorKinds = useMemo(
    () => getAnchorKindsForSurface(sessionContext?.surface, sessionContext?.answerRevealed),
    [sessionContext?.answerRevealed, sessionContext?.surface]
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
  const selectionActionStyle = selectionRect ? getSelectionActionStyle(selectionRect) : null;
  const isStaticUiMode = uiMode === 'static';
  const displayFocusRect = isAnchoredUiMode ? activeFocus.rect : null;
  const isMobileSheet = viewport.width < motionProfile.sheetBreakpoint;
  const bubblePlacement = getBubblePlacement(
    isOpen && !isMobileSheet ? displayFocusRect : null,
    viewport,
    isMobileSheet ? 'sheet' : 'bubble',
    {
      desktop: motionProfile.desktopBubbleWidth,
      mobile: motionProfile.mobileBubbleWidth,
    },
    {
      protectedRects: activeSelectionContainerRect ? [activeSelectionContainerRect] : [],
    }
  );
  const showAttachedAvatarShell = isOpen && isAnchoredUiMode;
  const hideFloatingAvatar = isOpen && isStaticUiMode;
  const showFloatingAvatar = !showAttachedAvatarShell && !hideFloatingAvatar;
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
  const avatarStyle =
    showAttachedAvatarShell || (isOpen && bubblePlacement.mode === 'sheet')
      ? getDockAvatarStyle()
      : isOpen && displayFocusRect
        ? getAnchorAvatarStyle(displayFocusRect)
        : getDockAvatarStyle();
  const avatarAnchorKind = isOpen && isAnchoredUiMode ? activeFocus.kind ?? 'dock' : 'dock';
  const pointerMarkerId = `kangur-ai-tutor-pointer-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const panelAvatarPlacement = showAttachedAvatarShell
    ? 'attached'
    : hideFloatingAvatar
      ? 'hidden'
      : 'independent';
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
  const hasCurrentQuestion = Boolean(
    sessionContext?.questionId?.trim() || sessionContext?.currentQuestion?.trim()
  );
  const hasAssignmentSummary = Boolean(
    sessionContext?.assignmentId?.trim() || sessionContext?.assignmentSummary?.trim()
  );
  const quickActions = buildQuickActions({
    surface: sessionContext?.surface,
    answerRevealed: sessionContext?.answerRevealed,
    hasSelectedText: Boolean(activeSelectedText),
    hasCurrentQuestion,
    hasAssignmentSummary,
    focusKind: activeFocus.kind,
  });
  const emptyStateMessage = getEmptyStateMessage({
    surface: sessionContext?.surface,
    answerRevealed: sessionContext?.answerRevealed,
    hasCurrentQuestion,
    hasAssignmentSummary,
    hasSelectedText: Boolean(activeSelectedText),
  });
  const inputPlaceholder = getInputPlaceholder({
    canSendMessages,
    surface: sessionContext?.surface,
    answerRevealed: sessionContext?.answerRevealed,
    hasCurrentQuestion,
    hasAssignmentSummary,
    hasSelectedText: Boolean(activeSelectedText),
  });
  const avatarButtonClassName = cn(
    'flex h-14 w-14 items-center justify-center rounded-full',
    'border-2 border-amber-900 bg-gradient-to-br from-amber-300 via-orange-400 to-orange-500',
    'shadow-[0_14px_28px_-16px_rgba(154,82,24,0.26)] hover:brightness-[1.03]',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2'
  );

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
      setPersistedSelectionRect(cloneRect(selectionRect));
      setPersistedSelectionContainerRect(cloneRect(selectionContainerRect));
      return trimmedSelectedText;
    },
    [
      allowSelectedTextSupport,
      selectedText,
      selectionContainerRect,
      selectionRect,
      setHighlightedText,
    ]
  );

  const handleOpenChat = useCallback(
    (reason: 'toggle' | 'selection'): void => {
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
        setPersistedSelectionContainerRect(null);
      }
      closeChat();
    },
    [
      activeFocus.kind,
      clearSelection,
      closeChat,
      messages.length,
      setPersistedSelectionContainerRect,
      setHighlightedText,
      telemetryContext,
    ]
  );

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

  if (!enabled || !mounted) return null;

  const handleAskAbout = (): void => {
    const persistedSelectedText = persistSelectionContext({ prefillInput: true });
    if (!persistedSelectedText) return;
    trackKangurClientEvent('kangur_ai_tutor_selection_cta_clicked', {
      surface: sessionContext?.surface ?? null,
      contentId: sessionContext?.contentId ?? null,
      title: sessionContext?.title ?? null,
      selectionLength: persistedSelectedText.length,
    });
    handleOpenChat('selection');
  };

  const handleSelectionActionMouseDown = (
    event: React.MouseEvent<HTMLButtonElement>
  ): void => {
    // Keep the browser selection alive long enough for the CTA click to open the tutor
    // against the current highlighted fragment.
    event.preventDefault();
  };

  const handleAvatarMouseDown = (event: React.MouseEvent<HTMLButtonElement>): void => {
    if (!isOpen && allowSelectedTextSupport && selectedText && selectionRect) {
      // Keep the lesson selection stable when opening via the launcher.
      event.preventDefault();
    }
  };

  const handleSend = async (): Promise<void> => {
    const text = inputValue.trim();
    if (!text || isLoading || !canSendMessages) return;
    setInputValue('');
    if (activeSelectedText && selectionRect) {
      setPersistedSelectionRect(cloneRect(selectionRect));
    }
    if (activeSelectedText && selectionContainerRect) {
      setPersistedSelectionContainerRect(cloneRect(selectionContainerRect));
    }
    await sendMessage(text, {
      promptMode: activeSelectedText ? 'selected_text' : 'chat',
      selectedText: activeSelectedText,
      focusKind: activeFocus.kind === 'selection' ? 'selection' : activeFocus.kind ?? undefined,
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

  const handleQuickAction = async (action: TutorQuickAction): Promise<void> => {
    if (isLoading || !canSendMessages) return;
    if (activeSelectedText && selectionRect) {
      setPersistedSelectionRect(cloneRect(selectionRect));
    }
    if (activeSelectedText && selectionContainerRect) {
      setPersistedSelectionContainerRect(cloneRect(selectionContainerRect));
    }
    trackKangurClientEvent('kangur_ai_tutor_quick_action_clicked', {
      ...telemetryContext,
      action: action.id,
      promptMode: action.promptMode,
      hasSelectedText: Boolean(activeSelectedText),
      focusKind: activeFocus.kind ?? null,
    });
    await sendMessage(action.prompt, {
      promptMode: action.promptMode,
      selectedText: activeSelectedText,
      focusKind: activeFocus.kind === 'selection' ? 'selection' : activeFocus.kind ?? undefined,
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

  const handleFollowUpClick = (
    action: KangurAiTutorFollowUpAction,
    messageIndex: number
  ): void => {
    trackKangurClientEvent('kangur_ai_tutor_follow_up_clicked', {
      ...telemetryContext,
      actionId: action.id,
      actionPage: action.page,
      messageIndex,
      hasQuery: Boolean(action.query && Object.keys(action.query).length > 0),
    });
  };

  return createPortal(
    <>
      <AnimatePresence>
        {allowSelectedTextSupport && selectedText && selectionRect && !isOpen && selectionActionStyle ? (
          <motion.div
            key='highlight-tooltip'
            data-testid='kangur-ai-tutor-selection-action'
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
            style={selectionActionStyle}
            className='z-[70]'
          >
            <KangurButton
              size='sm'
              variant='primary'
              type='button'
              onMouseDown={handleSelectionActionMouseDown}
              onClick={handleAskAbout}
              className='border-2 border-slate-900 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.14)]'
            >
              <BrainCircuit className='h-3.5 w-3.5' />
              Zapytaj o to
            </KangurButton>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {showFloatingAvatar ? (
        <motion.button
          data-testid='kangur-ai-tutor-avatar'
          data-anchor-kind={avatarAnchorKind}
          data-avatar-placement='floating'
          data-motion-preset={motionProfile.kind}
          data-motion-behavior={prefersReducedMotion ? 'reduced' : 'animated'}
          data-ui-mode={uiMode}
          type='button'
          onMouseDown={handleAvatarMouseDown}
          onClick={(): void => (isOpen ? handleCloseChat('toggle') : handleOpenChat('toggle'))}
          initial={false}
          animate={avatarStyle}
          transition={prefersReducedMotion ? reducedMotionTransitions.instant : motionProfile.avatarTransition}
          whileHover={prefersReducedMotion ? undefined : { scale: motionProfile.hoverScale }}
          whileTap={prefersReducedMotion ? undefined : { scale: motionProfile.tapScale }}
          className={cn('fixed z-[60]', avatarButtonClassName)}
          aria-label={isOpen ? 'Zamknij pomocnika' : 'Otwórz pomocnika AI'}
        >
          <TutorMoodAvatar
            svgContent={tutorAvatarSvg}
            avatarImageUrl={tutorAvatarImageUrl}
            label={`${tutorName} avatar (${tutorMoodId})`}
            className='h-12 w-12 border border-white/25 bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]'
            svgClassName='[&_svg]:drop-shadow-[0_1px_1px_rgba(15,23,42,0.1)]'
            data-testid='kangur-ai-tutor-avatar-image'
          />
          {hasNewMessage && !isOpen && (
            <span className='absolute top-1 right-1 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white animate-pulse' />
          )}
        </motion.button>
      ) : null}

      <AnimatePresence>
        {isOpen && (
          <>
            {bubblePlacement.mode === 'sheet' ? (
              <motion.button
                key='chat-backdrop'
                data-testid='kangur-ai-tutor-backdrop'
                type='button'
                aria-label='Zamknij pomocnika'
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
                transition={prefersReducedMotion ? reducedMotionTransitions.instant : { duration: 0.18 }}
                className='fixed inset-0 z-[62] bg-slate-900/18'
                onClick={(): void => handleCloseChat('outside')}
              />
            ) : null}
            <motion.div
              key='chat-panel'
              data-testid='kangur-ai-tutor-panel'
              data-layout={bubblePlacement.mode}
              data-avatar-placement={panelAvatarPlacement}
              data-launch-origin={bubblePlacement.launchOrigin}
              data-motion-behavior={prefersReducedMotion ? 'reduced' : 'animated'}
              data-motion-preset={motionProfile.kind}
              data-motion-state={panelMotionState}
              data-open-animation={panelOpenAnimation}
              data-placement-strategy={bubblePlacement.strategy}
              data-has-pointer={avatarPointer ? 'true' : 'false'}
              data-pointer-side={avatarPointer?.side ?? 'none'}
              data-ui-mode={uiMode}
              initial={
                prefersReducedMotion
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
              animate={{
                ...bubblePlacement.style,
                opacity: 1,
                x: 0,
                y: 0,
                ...(bubblePlacement.mode === 'sheet' ? {} : { scale: 1 }),
              }}
              exit={
                prefersReducedMotion
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
              transition={panelTransition}
              className='fixed z-[65]'
              style={bubblePlacement.width ? { width: bubblePlacement.width } : undefined}
            >
              {avatarPointer ? (
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
              {showAttachedAvatarShell ? (
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
                surface='solid'
                variant='soft'
                className={cn(
                  'relative flex flex-col overflow-hidden border-2 border-slate-900 bg-[#fffdf4]/95 shadow-[0_24px_48px_-28px_rgba(15,23,42,0.16)]',
                  bubblePlacement.mode === 'sheet'
                    ? 'rounded-[28px] rounded-b-[24px]'
                    : 'rounded-[28px]'
                )}
                style={{ maxHeight: bubblePlacement.mode === 'sheet' ? 'min(76vh, 680px)' : '70vh' }}
              >
                {!avatarPointer && bubblePlacement.tailPlacement !== 'dock' ? (
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

                {bubblePlacement.mode === 'sheet' ? (
                  <div className='flex justify-center bg-[#fffdf4]/98 px-3 pt-3'>
                    <div aria-hidden='true' className='h-1.5 w-14 rounded-full bg-slate-300' />
                  </div>
                ) : null}

                <div
                  data-testid='kangur-ai-tutor-header'
                  className='flex items-center justify-between bg-gradient-to-r from-amber-300 via-orange-400 to-orange-500 px-4 py-3'
                >
                  <div className='flex items-center gap-2'>
                    <TutorMoodAvatar
                      svgContent={tutorAvatarSvg}
                      avatarImageUrl={tutorAvatarImageUrl}
                      label={`${tutorName} header avatar (${tutorMoodId})`}
                      className='h-9 w-9 border border-white/20 bg-white/14'
                      svgClassName='[&_svg]:drop-shadow-[0_1px_1px_rgba(15,23,42,0.08)]'
                      data-testid='kangur-ai-tutor-header-avatar-image'
                    />
                    <div className='flex flex-col'>
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
                  </div>
                  <button
                    type='button'
                    onClick={(): void => handleCloseChat('header')}
                    className='text-white/80 hover:text-white transition-colors'
                    aria-label='Zamknij'
                  >
                    <X className='h-4 w-4' />
                  </button>
                </div>

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
                  </div>
                  {activeSelectedText ? (
                    <div className='mt-2 rounded-2xl border border-slate-900/10 bg-white/80 px-3 py-2 text-xs italic leading-relaxed text-slate-700'>
                    "{selectedTextPreview}"
                      {activeSelectedText.length > (selectedTextPreview?.length ?? 0) ? '…' : ''}
                    </div>
                  ) : null}
                </div>

                <div className='flex flex-wrap gap-2 border-b border-slate-100 px-3 py-3'>
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
                      {emptyStateMessage}
                    </p>
                  ) : (
                    messages.map((msg, index) =>
                      msg.role === 'user' ? (
                        <div key={index} className='flex justify-end'>
                          <div className='max-w-[80%] rounded-[22px] border border-orange-400 bg-gradient-to-br from-orange-400 to-amber-500 px-3 py-2 text-sm leading-relaxed text-white shadow-[0_16px_28px_-20px_rgba(249,115,22,0.58)]'>
                            {msg.content}
                          </div>
                        </div>
                      ) : (
                        <div key={index} className='flex justify-start'>
                          <div className='w-full max-w-[90%] space-y-2'>
                            <div className='rounded-[22px] border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800 shadow-sm'>
                              {msg.content}
                            </div>
                            {msg.followUpActions?.length ? (
                              <div className='space-y-2'>
                                <div className='text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400'>
                                Kolejny krok
                                </div>
                                <div className='grid gap-2 sm:grid-cols-2'>
                                  {msg.followUpActions.map((action) => (
                                    <div
                                      key={action.id}
                                      className='rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-3'
                                    >
                                      {action.reason ? (
                                        <div className='text-xs font-medium leading-relaxed text-slate-700'>
                                          {action.reason}
                                        </div>
                                      ) : null}
                                      <KangurButton
                                        asChild
                                        size='sm'
                                        variant='primary'
                                        className={cn('mt-2 w-full', action.reason ? '' : 'mt-0')}
                                      >
                                        <Link
                                          href={toFollowUpHref(basePath, action)}
                                          onClick={() => handleFollowUpClick(action, index)}
                                          targetPageKey={action.page}
                                        >
                                          {action.label}
                                        </Link>
                                      </KangurButton>
                                    </div>
                                  ))}
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
                          </div>
                        </div>
                      )
                    )
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
                    placeholder={inputPlaceholder}
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
