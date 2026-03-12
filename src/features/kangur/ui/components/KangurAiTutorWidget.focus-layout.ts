'use client';

import { useMemo, type CSSProperties } from 'react';

import { resolveKangurTutorSectionKnowledgeReference } from '@/features/kangur/ai-tutor-section-knowledge';
import type {
  KangurTutorAnchorKind,
  KangurTutorAnchorRegistration,
} from '@/features/kangur/ui/context/kangur-tutor-types';
import { selectBestTutorAnchor } from '@/features/kangur/ui/context/KangurTutorAnchorContext';

import { getEstimatedBubbleHeight } from './KangurAiTutorGuidedLayout';
import { selectBestSelectionAnchor } from './KangurAiTutorWidget.helpers';
import {
  AVATAR_SIZE,
  CTA_HEIGHT,
  CTA_WIDTH,
  EDGE_GAP,
  PROTECTED_CONTENT_GAP,
  type ActiveTutorFocus,
  type TutorConversationFocus,
  type TutorBubblePlacementStrategy,
  type TutorHorizontalSide,
  type TutorMotionPosition,
  type TutorMotionProfile,
  getTutorEntryDirection,
} from './KangurAiTutorWidget.shared';

import type { SectionExplainContext, TutorSurface } from './KangurAiTutorWidget.types';

type SelectionActionLayout = {
  placement: 'top' | 'bottom' | 'left' | 'right';
  style: CSSProperties;
};

type BubblePlacement = {
  entryDirection: TutorHorizontalSide;
  launchOrigin: 'dock-bottom-right' | 'sheet';
  mode: 'bubble' | 'sheet';
  strategy: TutorBubblePlacementStrategy;
  style: TutorMotionPosition;
  tailPlacement: 'top' | 'bottom' | 'dock';
  width?: number;
};

type UseKangurAiTutorFocusLayoutStateInput = {
  activeSectionRect: DOMRect | null;
  activeSelectedText: string | null;
  activeSelectionRect: DOMRect | null;
  allowSelectedTextSupport: boolean;
  guidedTutorTarget: { kind: string } | null;
  hasAssignmentSummary: boolean;
  hasCurrentQuestion: boolean;
  highlightedSection: SectionExplainContext | null;
  homeOnboardingStepIndex: number | null;
  isOpen: boolean;
  isSelectionWithinTutorUi: () => boolean;
  isTutorHidden: boolean;
  motionProfile: TutorMotionProfile;
  panelAnchorMode: 'contextual' | 'dock';
  selectedText: string | null;
  selectionRect: DOMRect | null;
  sessionContext: {
    answerRevealed: boolean | undefined;
    contentId: string | null | undefined;
    selectedChoiceLabel: string | null | undefined;
    surface: TutorSurface | null | undefined;
  };
  tutorAnchorContext: {
    anchors: KangurTutorAnchorRegistration[];
  } | null;
  uiMode: 'anchored' | 'freeform' | 'static';
  viewport: {
    height: number;
    width: number;
  };
  viewportTick: number;
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

const getDockAvatarRect = (viewport: { width: number; height: number }): DOMRect =>
  createRect(
    viewport.width - EDGE_GAP - AVATAR_SIZE,
    viewport.height - EDGE_GAP - AVATAR_SIZE,
    AVATAR_SIZE,
    AVATAR_SIZE
  );

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

const getSelectionActionLayout = (
  rect: DOMRect,
  viewport: { width: number; height: number }
): SelectionActionLayout => {
  const gap = 12;
  const maxLeft = viewport.width - EDGE_GAP - CTA_WIDTH;
  const maxTop = viewport.height - EDGE_GAP - CTA_HEIGHT;
  const centeredLeft = rect.left + rect.width / 2 - CTA_WIDTH / 2;
  const centeredTop = rect.top + rect.height / 2 - CTA_HEIGHT / 2;
  const candidates: Array<{
    left: number;
    placement: 'top' | 'bottom' | 'left' | 'right';
    priority: number;
    top: number;
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
        left,
        overlapArea,
        placement: candidate.placement,
        score,
        top,
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
    left: clamp(centeredLeft, EDGE_GAP, maxLeft),
    overlapArea: 0,
    placement: 'bottom' as const,
    score: 0,
    top: clamp(rect.bottom + gap, EDGE_GAP, maxTop),
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

export const getTutorBubblePlacement = (
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
): BubblePlacement => {
  if (mode === 'sheet') {
    return {
      entryDirection: 'right',
      launchOrigin: 'sheet',
      mode,
      strategy: 'dock',
      style: {
        left: EDGE_GAP,
        right: EDGE_GAP,
        bottom: EDGE_GAP,
      },
      tailPlacement: 'dock',
    };
  }

  const preferredWidth = Math.min(
    viewport.width - EDGE_GAP * 2,
    viewport.width < 640 ? widthConfig.mobile : widthConfig.desktop
  );

  if (!rect) {
    return {
      entryDirection: 'right',
      launchOrigin: 'dock-bottom-right',
      mode,
      strategy: 'dock',
      style: {
        left: viewport.width - EDGE_GAP - preferredWidth,
        top: clamp(viewport.height - 440, EDGE_GAP, viewport.height - EDGE_GAP - 220),
      },
      tailPlacement: 'dock',
      width: preferredWidth,
    };
  }

  const estimatedHeight = options?.estimatedHeight ?? getEstimatedBubbleHeight(viewport);
  const protectedRects = options?.protectedRects?.filter(Boolean) ?? [];
  const protectedZone = getRectUnion([rect, ...protectedRects]) ?? rect;
  const entryDirection = getTutorEntryDirection(rect, viewport.width);
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
    left: number;
    priority: number;
    strategy: TutorBubblePlacementStrategy;
    tailPlacement: 'top' | 'bottom' | 'dock';
    top: number;
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
        primaryOverlapArea,
        score,
        secondaryOverlapArea,
        top,
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
    entryDirection,
    launchOrigin: 'dock-bottom-right',
    mode,
    strategy: bestCandidate?.candidate.strategy ?? 'dock',
    style: {
      left: bestCandidate?.left ?? viewport.width - EDGE_GAP - width,
      top:
        bestCandidate?.top ??
        clamp(viewport.height - 440, EDGE_GAP, viewport.height - EDGE_GAP - 220),
    },
    tailPlacement: bestCandidate?.candidate.tailPlacement ?? 'dock',
    width,
  };
};

const getAnchorKindsForSurface = (
  surface: TutorSurface | null | undefined,
  contentId: string | null | undefined,
  answerRevealed: boolean | undefined,
  selectedChoiceLabel: string | null | undefined,
  hasCurrentQuestion: boolean,
  hasAssignmentSummary: boolean
): KangurTutorAnchorKind[] => {
  if (surface === 'lesson') {
    if (!contentId || contentId === 'lesson:list') {
      return ['hero', 'library', 'empty_state'];
    }

    return ['assignment', 'lesson_header', 'document', 'screen', 'empty_state', 'navigation'];
  }

  if (surface === 'test') {
    if (!hasCurrentQuestion && !answerRevealed) {
      return ['empty_state', 'question', 'review', 'summary'];
    }

    if (selectedChoiceLabel && !answerRevealed) {
      return ['selection', 'question', 'review', 'summary', 'empty_state'];
    }

    return answerRevealed
      ? ['review', 'summary', 'question', 'empty_state']
      : ['question', 'review', 'summary', 'empty_state'];
  }

  if (surface === 'game') {
    if (
      contentId === 'game:home' &&
      !answerRevealed &&
      !hasCurrentQuestion &&
      !hasAssignmentSummary
    ) {
      return ['hero', 'home_actions', 'home_quest', 'priority_assignments', 'progress', 'leaderboard'];
    }

    if (
      contentId === 'game:training-setup' ||
      contentId === 'game:operation-selector' ||
      contentId === 'game:calendar_quiz' ||
      contentId === 'game:geometry_quiz' ||
      contentId?.startsWith('game:kangur:')
    ) {
      return ['screen'];
    }

    return answerRevealed
      ? ['review', 'leaderboard', 'assignment', 'question']
      : ['question', 'assignment', 'screen'];
  }

  if (surface === 'profile') {
    return ['hero', 'progress', 'summary', 'assignment', 'screen'];
  }

  if (surface === 'parent_dashboard') {
    if (contentId === 'parent-dashboard:guest') {
      return ['hero'];
    }

    if (contentId?.endsWith(':progress')) {
      return ['progress', 'navigation', 'hero', 'screen'];
    }

    if (contentId?.endsWith(':scores')) {
      return ['summary', 'navigation', 'hero', 'screen'];
    }

    if (contentId?.endsWith(':assign')) {
      return ['assignment', 'navigation', 'hero', 'screen'];
    }

    if (contentId?.endsWith(':ai-tutor')) {
      return ['screen', 'navigation', 'hero'];
    }

    return ['hero', 'navigation', 'screen'];
  }

  if (surface === 'auth') {
    if (contentId?.includes(':create-account')) {
      return ['login_identifier_field', 'login_form', 'create_account_action'];
    }

    return ['login_identifier_field', 'login_form', 'login_action'];
  }

  return [];
};

export function useKangurAiTutorFocusLayoutState({
  activeSectionRect,
  activeSelectedText,
  activeSelectionRect,
  allowSelectedTextSupport,
  guidedTutorTarget,
  hasAssignmentSummary,
  hasCurrentQuestion,
  highlightedSection,
  homeOnboardingStepIndex,
  isOpen,
  isSelectionWithinTutorUi,
  isTutorHidden,
  motionProfile,
  panelAnchorMode,
  selectedText,
  selectionRect,
  sessionContext,
  tutorAnchorContext,
  uiMode,
  viewport,
  viewportTick,
}: UseKangurAiTutorFocusLayoutStateInput) {
  const anchorKinds = useMemo(
    () =>
      getAnchorKindsForSurface(
        sessionContext.surface,
        sessionContext.contentId,
        sessionContext.answerRevealed,
        sessionContext.selectedChoiceLabel,
        hasCurrentQuestion,
        hasAssignmentSummary
      ),
    [
      hasAssignmentSummary,
      hasCurrentQuestion,
      sessionContext.answerRevealed,
      sessionContext.contentId,
      sessionContext.selectedChoiceLabel,
      sessionContext.surface,
    ]
  );
  const anchorKindsKey = anchorKinds.join(':');

  const registeredAnchor = useMemo(() => {
    if (!isOpen || !tutorAnchorContext) {
      return null;
    }

    return selectBestTutorAnchor({
      anchors: tutorAnchorContext.anchors,
      contentId: sessionContext.contentId,
      kinds: anchorKinds,
      surface: sessionContext.surface,
    });
  }, [
    anchorKinds,
    anchorKindsKey,
    isOpen,
    sessionContext.contentId,
    sessionContext.surface,
    tutorAnchorContext,
  ]);

  const selectionConversationAnchor = useMemo(() => {
    if (!activeSelectionRect || !tutorAnchorContext) {
      return null;
    }

    return selectBestSelectionAnchor({
      anchors: tutorAnchorContext.anchors,
      selectionRect: activeSelectionRect,
      sessionContentId: sessionContext.contentId,
      sessionSurface: sessionContext.surface,
    });
  }, [
    activeSelectionRect,
    sessionContext.contentId,
    sessionContext.surface,
    tutorAnchorContext,
    viewportTick,
  ]);

  const activeFocus = useMemo<ActiveTutorFocus>(() => {
    const baseConversationFocus: TutorConversationFocus = {
      assignmentId: null,
      contentId: sessionContext.contentId ?? null,
      id: null,
      kind: null,
      knowledgeReference: null,
      label: null,
      surface: sessionContext.surface ?? null,
    };

    if (activeSelectionRect) {
      const selectionWithinHighlightedSection =
        activeSectionRect !== null &&
        highlightedSection !== null &&
        getRectOverlapArea(activeSelectionRect, activeSectionRect) > 0;
      const conversationFocus: TutorConversationFocus = selectionWithinHighlightedSection &&
        highlightedSection
          ? {
              assignmentId: highlightedSection.assignmentId,
              contentId: highlightedSection.contentId ?? sessionContext.contentId ?? null,
              id: highlightedSection.anchorId,
              kind: highlightedSection.kind,
              knowledgeReference: highlightedSection.knowledgeReference,
              label: highlightedSection.label,
              surface: highlightedSection.surface,
            }
          : selectionConversationAnchor
            ? {
                assignmentId: selectionConversationAnchor.metadata?.assignmentId ?? null,
                contentId:
                  selectionConversationAnchor.metadata?.contentId ?? sessionContext.contentId ?? null,
                id: selectionConversationAnchor.id,
                kind: selectionConversationAnchor.kind,
                knowledgeReference: resolveKangurTutorSectionKnowledgeReference({
                  anchorId: selectionConversationAnchor.id,
                  contentId:
                    selectionConversationAnchor.metadata?.contentId ??
                    sessionContext.contentId ??
                    null,
                  focusKind: selectionConversationAnchor.kind,
                }),
                label: selectionConversationAnchor.metadata?.label ?? activeSelectedText,
                surface: selectionConversationAnchor.surface,
              }
          : {
              ...baseConversationFocus,
              id: 'selection',
              kind: 'selection',
              label: activeSelectedText,
            };

      return {
        assignmentId: null,
        conversationFocus,
        id: 'selection',
        kind: 'selection',
        label: activeSelectedText,
        rect: activeSelectionRect,
      };
    }

    if (activeSectionRect && highlightedSection) {
      const conversationFocus: TutorConversationFocus = {
        assignmentId: highlightedSection.assignmentId,
        contentId: highlightedSection.contentId ?? sessionContext.contentId ?? null,
        id: highlightedSection.anchorId,
        kind: highlightedSection.kind,
        knowledgeReference: highlightedSection.knowledgeReference,
        label: highlightedSection.label,
        surface: highlightedSection.surface,
      };

      return {
        assignmentId: highlightedSection.assignmentId,
        conversationFocus,
        id: highlightedSection.anchorId,
        kind: highlightedSection.kind,
        label: highlightedSection.label,
        rect: activeSectionRect,
      };
    }

    if (registeredAnchor) {
      const registeredAnchorKnowledgeReference =
        registeredAnchor.kind === 'selection'
          ? resolveKangurTutorSectionKnowledgeReference({
            anchorId: registeredAnchor.id,
            contentId: registeredAnchor.metadata?.contentId ?? sessionContext.contentId ?? null,
            focusKind: 'selection',
          })
          : null;
      const conversationFocus: TutorConversationFocus = {
        assignmentId: registeredAnchor.metadata?.assignmentId ?? null,
        contentId: registeredAnchor.metadata?.contentId ?? sessionContext.contentId ?? null,
        id: registeredAnchor.id,
        kind: registeredAnchor.kind,
        knowledgeReference: registeredAnchorKnowledgeReference,
        label: registeredAnchor.metadata?.label ?? null,
        surface: registeredAnchor.surface,
      };

      return {
        assignmentId: registeredAnchor.metadata?.assignmentId ?? null,
        conversationFocus,
        id: registeredAnchor.id,
        kind: registeredAnchor.kind,
        label: registeredAnchor.metadata?.label ?? null,
        rect: registeredAnchor.getRect(),
      };
    }

    return {
      assignmentId: null,
      conversationFocus: baseConversationFocus,
      id: null,
      kind: null,
      label: null,
      rect: null,
    };
  }, [
    activeSectionRect,
    activeSelectedText,
    activeSelectionRect,
    highlightedSection,
    registeredAnchor,
    selectionConversationAnchor,
    sessionContext.contentId,
    sessionContext.surface,
    viewportTick,
  ]);

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
  const isFreeformUiMode = uiMode === 'freeform';
  const isAnchoredUiMode = uiMode === 'anchored';
  const isContextualPanelAnchor = panelAnchorMode === 'contextual' && isAnchoredUiMode;
  const displayFocusRect = isAnchoredUiMode && isContextualPanelAnchor ? activeFocus.rect : null;
  const isMobileSheet = viewport.width < motionProfile.sheetBreakpoint;

  return {
    activeFocus,
    displayFocusRect,
    isAnchoredUiMode,
    isContextualPanelAnchor,
    isFreeformUiMode,
    isMobileSheet,
    isStaticUiMode,
    selectionActionLayout,
    selectionActionStyle,
    shouldRenderSelectionAction,
  };
}

export function useKangurAiTutorBubblePlacementState(input: {
  activeSectionProtectedRect: DOMRect | null;
  activeSelectionProtectedRect: DOMRect | null;
  displayFocusRect: DOMRect | null;
  isMobileSheet: boolean;
  isOpen: boolean;
  motionProfile: TutorMotionProfile;
  panelMeasuredHeight: number | null;
  viewport: {
    height: number;
    width: number;
  };
  visibleQuickActionCount: number;
  visibleProactiveNudge: boolean;
}): BubblePlacement {
  const {
    activeSectionProtectedRect,
    activeSelectionProtectedRect,
    displayFocusRect,
    isMobileSheet,
    isOpen,
    motionProfile,
    panelMeasuredHeight,
    viewport,
    visibleQuickActionCount,
    visibleProactiveNudge,
  } = input;

  return useMemo(() => {
    const estimatedBubbleHeight = isMobileSheet
      ? undefined
      : Math.max(
        panelMeasuredHeight ?? 0,
        getEstimatedBubbleHeight(
          viewport,
          (visibleProactiveNudge ? 108 : 0) + (visibleQuickActionCount > 2 ? 24 : 0)
        )
      );

    return getTutorBubblePlacement(
      isOpen && !isMobileSheet ? displayFocusRect : null,
      viewport,
      isMobileSheet ? 'sheet' : 'bubble',
      {
        desktop: motionProfile.desktopBubbleWidth,
        mobile: motionProfile.mobileBubbleWidth,
      },
      {
        estimatedHeight: estimatedBubbleHeight,
        protectedRects: [
          ...(activeSelectionProtectedRect ? [activeSelectionProtectedRect] : []),
          ...(activeSectionProtectedRect ? [activeSectionProtectedRect] : []),
        ],
      }
    );
  }, [
    activeSectionProtectedRect,
    activeSelectionProtectedRect,
    displayFocusRect,
    isMobileSheet,
    isOpen,
    motionProfile.desktopBubbleWidth,
    motionProfile.mobileBubbleWidth,
    panelMeasuredHeight,
    viewport,
    visibleProactiveNudge,
    visibleQuickActionCount,
  ]);
}
