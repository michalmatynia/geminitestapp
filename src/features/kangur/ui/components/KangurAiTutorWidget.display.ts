'use client';

import { useEffect, useMemo, useState } from 'react';

import type {
  KangurTutorAnchorRegistration,
} from '@/features/kangur/ui/context/kangur-tutor-types';
import { selectBestTutorAnchor } from '@/features/kangur/ui/context/KangurTutorAnchorContext';
import {
  formatKangurAiTutorTemplate,
  type KangurAiTutorContent,
} from '@/shared/contracts/kangur-ai-tutor-content';
import { getMotionSafeScrollBehavior } from '@/shared/utils';

import {
  getBoundingRectFromRects,
  cloneRect,
  getExpandedRect,
  getViewportRectFromPageRect,
  isAuthGuidedTutorTarget,
  isSectionExplainableTutorAnchor,
  isSectionGuidedTutorTarget,
  isSelectionGuidedTutorTarget,
} from './KangurAiTutorWidget.helpers';

import type {
  GuidedTutorSectionKind,
  GuidedTutorTarget,
  PendingSelectionResponse,
  SectionExplainContext,
  TutorHomeOnboardingStep,
  TutorSurface,
} from './KangurAiTutorWidget.types';
import type { KangurAuthMode } from '@/shared/contracts/kangur-auth';

const SECTION_DROP_TARGET_PADDING_X = 12;
const SECTION_DROP_TARGET_PADDING_Y = 12;

type TutorAnchorRegistry = {
  anchors: KangurTutorAnchorRegistration[];
} | null;

type GuidedMode = 'home_onboarding' | 'selection' | 'section' | 'auth' | null;

const buildHomeOnboardingStepDefinitions = (
  tutorContent: KangurAiTutorContent
): TutorHomeOnboardingStep[] => [
  {
    id: 'home-actions',
    kind: 'home_actions',
    title: tutorContent.homeOnboarding.steps.home_actions.title,
    description: tutorContent.homeOnboarding.steps.home_actions.description,
  },
  {
    id: 'home-quest',
    kind: 'home_quest',
    title: tutorContent.homeOnboarding.steps.home_quest.title,
    description: tutorContent.homeOnboarding.steps.home_quest.description,
  },
  {
    id: 'priority-assignments',
    kind: 'priority_assignments',
    title: tutorContent.homeOnboarding.steps.priority_assignments.title,
    description: tutorContent.homeOnboarding.steps.priority_assignments.description,
  },
  {
    id: 'leaderboard',
    kind: 'leaderboard',
    title: tutorContent.homeOnboarding.steps.leaderboard.title,
    description: tutorContent.homeOnboarding.steps.leaderboard.description,
  },
  {
    id: 'progress',
    kind: 'progress',
    title: tutorContent.homeOnboarding.steps.progress.title,
    description: tutorContent.homeOnboarding.steps.progress.description,
  },
];

export function useKangurAiTutorGuidedDisplayState(input: {
  activeSectionRect: DOMRect | null;
  activeSelectionPageRect: DOMRect | null;
  activeSelectionPageRects: DOMRect[];
  activeSelectionRect: DOMRect | null;
  askModalVisible: boolean;
  enabled: boolean;
  guestTutorAssistantLabel: string;
  guidedTutorTarget: GuidedTutorTarget | null;
  homeOnboardingEligibleContentId: string;
  homeOnboardingRecordStatus: 'shown' | 'completed' | 'dismissed' | null;
  homeOnboardingStepIndex: number | null;
  hoveredSectionAnchorId: string | null;
  isAuthenticated: boolean | undefined;
  isLoading: boolean;
  loginModalIsOpen: boolean;
  isOpen: boolean;
  isTutorHidden: boolean;
  mounted: boolean;
  openLoginModal: (
    callbackUrl?: string | null,
    options?: { authMode?: KangurAuthMode }
  ) => void;
  persistedSelectionPageRect: DOMRect | null;
  persistedSelectionPageRects: DOMRect[];
  persistedSelectionRect: DOMRect | null;
  sectionResponsePending: SectionExplainContext | null;
  sheetBreakpoint: number;
  selectionGuidanceCalloutVisibleText: string | null;
  selectionResponsePending: PendingSelectionResponse | null;
  sessionContentId: string | null | undefined;
  sessionSurface: TutorSurface | null | undefined;
  tutorAnchorContext: TutorAnchorRegistry;
  tutorContent: KangurAiTutorContent;
  tutorName: string;
  viewportTick: number;
}) {
  const {
    activeSectionRect,
    activeSelectionPageRect,
    activeSelectionPageRects,
    activeSelectionRect,
    askModalVisible,
    enabled,
    guestTutorAssistantLabel,
    guidedTutorTarget,
    homeOnboardingEligibleContentId,
    homeOnboardingRecordStatus,
    homeOnboardingStepIndex,
    hoveredSectionAnchorId,
    isAuthenticated,
    isLoading,
    isOpen,
    isTutorHidden,
    mounted,
    persistedSelectionPageRect,
    persistedSelectionPageRects,
    persistedSelectionRect,
    sectionResponsePending,
    sheetBreakpoint,
    selectionGuidanceCalloutVisibleText,
    selectionResponsePending,
    sessionContentId,
    sessionSurface,
    tutorAnchorContext,
    tutorContent,
    tutorName,
    viewportTick,
  } = input;
  const [authGuidedAnchorRetryTick, setAuthGuidedAnchorRetryTick] = useState(0);

  const homeOnboardingSteps = useMemo(() => {
    if (
      !tutorAnchorContext ||
      sessionSurface !== 'game' ||
      sessionContentId !== homeOnboardingEligibleContentId
    ) {
      return [];
    }

    return buildHomeOnboardingStepDefinitions(tutorContent).filter((step) =>
      Boolean(
        selectBestTutorAnchor({
          anchors: tutorAnchorContext.anchors,
          surface: 'game',
          contentId: homeOnboardingEligibleContentId,
          kinds: [step.kind],
        })
      )
    );
  }, [
    homeOnboardingEligibleContentId,
    sessionContentId,
    sessionSurface,
    tutorAnchorContext,
    tutorContent,
  ]);

  const homeOnboardingStep =
    homeOnboardingStepIndex !== null
      ? (homeOnboardingSteps[homeOnboardingStepIndex] ?? null)
      : null;

  const canStartHomeOnboardingManually = Boolean(
    mounted &&
      isAuthenticated &&
      enabled &&
      !askModalVisible &&
      sessionSurface === 'game' &&
      sessionContentId === homeOnboardingEligibleContentId &&
      homeOnboardingSteps.length > 0 &&
      homeOnboardingStepIndex === null &&
      !guidedTutorTarget
  );

  const homeOnboardingReplayLabel =
    homeOnboardingRecordStatus === 'completed' || homeOnboardingRecordStatus === 'dismissed'
      ? tutorContent.homeOnboarding.manualReplayLabel
      : tutorContent.homeOnboarding.manualStartLabel;

  const isEligibleForHomeOnboarding = Boolean(
    mounted &&
      isAuthenticated &&
      enabled &&
      !isTutorHidden &&
      !askModalVisible &&
      sessionSurface === 'game' &&
      sessionContentId === homeOnboardingEligibleContentId &&
      homeOnboardingSteps.length > 0
  );

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

  const guidedSectionAnchor = useMemo(() => {
    if (!isSectionGuidedTutorTarget(guidedTutorTarget) || !tutorAnchorContext) {
      return null;
    }

    return (
      tutorAnchorContext.anchors.find(
        (
          anchor
        ): anchor is KangurTutorAnchorRegistration & {
          kind: GuidedTutorSectionKind;
          surface: TutorSurface;
        } => anchor.id === guidedTutorTarget.anchorId && isSectionExplainableTutorAnchor(anchor)
      ) ?? null
    );
  }, [guidedTutorTarget, tutorAnchorContext, viewportTick]);

  const hoveredSectionAnchor = useMemo(() => {
    if (!hoveredSectionAnchorId || !tutorAnchorContext) {
      return null;
    }

    return (
      tutorAnchorContext.anchors.find(
        (
          anchor
        ): anchor is KangurTutorAnchorRegistration & {
          kind: GuidedTutorSectionKind;
          surface: TutorSurface;
        } => anchor.id === hoveredSectionAnchorId && isSectionExplainableTutorAnchor(anchor)
      ) ?? null
    );
  }, [hoveredSectionAnchorId, tutorAnchorContext, viewportTick]);

  const homeOnboardingAnchor = useMemo(() => {
    if (!homeOnboardingStep || !tutorAnchorContext) {
      return null;
    }

    return selectBestTutorAnchor({
      anchors: tutorAnchorContext.anchors,
      surface: 'game',
      contentId: homeOnboardingEligibleContentId,
      kinds: [homeOnboardingStep.kind],
    });
  }, [homeOnboardingEligibleContentId, homeOnboardingStep, tutorAnchorContext, viewportTick]);

  const guidedFallbackRect = useMemo(() => {
    if (
      !isAuthGuidedTutorTarget(guidedTutorTarget) ||
      guidedTargetAnchor ||
      typeof document === 'undefined'
    ) {
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
  }, [authGuidedAnchorRetryTick, guidedTargetAnchor, guidedTutorTarget, viewportTick]);

  const guidedSelectionRect = useMemo(() => {
    if (!isSelectionGuidedTutorTarget(guidedTutorTarget) && !selectionResponsePending) {
      return null;
    }

    const selectionPageRects =
      activeSelectionPageRects.length > 0 ? activeSelectionPageRects : persistedSelectionPageRects;
    const selectionViewportRects = selectionPageRects
      .map((rect) => getViewportRectFromPageRect(rect))
      .filter((rect): rect is DOMRect => rect !== null);
    const selectionViewportBounds = getBoundingRectFromRects(selectionViewportRects);

    return cloneRect(
      selectionViewportBounds ??
        getViewportRectFromPageRect(activeSelectionPageRect ?? persistedSelectionPageRect) ??
        persistedSelectionRect ??
        activeSelectionRect
    );
  }, [
    activeSelectionPageRects,
    activeSelectionPageRect,
    activeSelectionRect,
    guidedTutorTarget,
    persistedSelectionPageRects,
    persistedSelectionPageRect,
    persistedSelectionRect,
    selectionResponsePending,
  ]);

  const guidedSelectionSpotlightRect =
    isSelectionGuidedTutorTarget(guidedTutorTarget) || selectionResponsePending
      ? cloneRect(guidedSelectionRect)
      : null;
  const guidedSelectionGlowRects: DOMRect[] = [];

  const isSelectionGuidedTutorMode = isSelectionGuidedTutorTarget(guidedTutorTarget);
  const isSectionGuidedTutorMode = isSectionGuidedTutorTarget(guidedTutorTarget);
  const isAskModalState = false;
  const isAskModalMode = false;
  const selectionGuidanceCalloutText = isSelectionGuidedTutorMode
    ? guidedTutorTarget.selectedText
    : (selectionResponsePending?.selectedText ?? null);
  const showSelectionGuidanceCallout =
    selectionGuidanceCalloutText !== null &&
    selectionGuidanceCalloutVisibleText === selectionGuidanceCalloutText &&
    (
      isSelectionGuidedTutorMode ||
      (!isTutorHidden && isOpen && !isAskModalState && selectionResponsePending !== null)
    );
  const showSectionGuidanceCallout =
    isSectionGuidedTutorMode ||
    (!isTutorHidden && isOpen && !isAskModalState && sectionResponsePending !== null);

  const guidedMode: GuidedMode = homeOnboardingStep
    ? 'home_onboarding'
    : isSelectionGuidedTutorMode
      ? 'selection'
      : isSectionGuidedTutorMode
        ? 'section'
        : isAuthGuidedTutorTarget(guidedTutorTarget)
          ? 'auth'
          : null;

  const guidedTargetLabel =
    guidedTargetAnchor?.metadata?.label?.trim() ||
    (isAuthGuidedTutorTarget(guidedTutorTarget)
      ? guidedTutorTarget.authMode === 'create-account'
        ? tutorContent.common.createAccountLabel
        : tutorContent.common.signInLabel
      : null);

  const sectionGuidanceLabel = isSectionGuidedTutorTarget(guidedTutorTarget)
    ? (guidedTutorTarget.label ?? null)
    : (sectionResponsePending?.label ?? null);

  const guidedCalloutTitle =
    guidedMode === 'home_onboarding'
      ? (homeOnboardingStep?.title ?? '')
      : showSelectionGuidanceCallout
        ? tutorContent.guidedCallout.selectionTitle
        : showSectionGuidanceCallout
          ? sectionGuidanceLabel
            ? formatKangurAiTutorTemplate(
              tutorContent.guidedCallout.sectionTitleTemplate,
              { label: sectionGuidanceLabel }
            )
            : `${tutorContent.guidedCallout.sectionPrefix}.`
          : isAuthGuidedTutorTarget(guidedTutorTarget) &&
              guidedTutorTarget.kind === 'login_identifier_field'
            ? guidedTutorTarget.authMode === 'create-account'
              ? tutorContent.guidedCallout.authTitles.createAccountIdentifier
              : tutorContent.guidedCallout.authTitles.signInIdentifier
            : isAuthGuidedTutorTarget(guidedTutorTarget) && guidedTutorTarget.kind === 'login_form'
              ? guidedTutorTarget.authMode === 'create-account'
                ? tutorContent.guidedCallout.authTitles.createAccountForm
                : tutorContent.guidedCallout.authTitles.signInForm
              : guidedTargetLabel && isAuthGuidedTutorTarget(guidedTutorTarget)
                ? formatKangurAiTutorTemplate(
                  guidedTutorTarget.authMode === 'create-account'
                    ? tutorContent.guidedCallout.authTitles.createAccountNav
                    : tutorContent.guidedCallout.authTitles.signInNav,
                  { label: guidedTargetLabel }
                )
                : null;

  const guidedCalloutDetail =
    guidedMode === 'home_onboarding'
      ? (homeOnboardingStep?.description ?? '')
      : showSelectionGuidanceCallout
        ? isLoading
          ? tutorContent.guidedCallout.selectionDetailPending
          : tutorContent.guidedCallout.selectionDetailSoon
        : showSectionGuidanceCallout
          ? isLoading
            ? tutorContent.guidedCallout.sectionDetailPending
            : tutorContent.guidedCallout.sectionDetailSoon
          : isAuthGuidedTutorTarget(guidedTutorTarget) &&
              guidedTutorTarget.kind === 'login_identifier_field'
            ? guidedTutorTarget.authMode === 'create-account'
              ? tutorContent.guidedCallout.authDetails.createAccountIdentifier
              : tutorContent.guidedCallout.authDetails.signInIdentifier
            : isAuthGuidedTutorTarget(guidedTutorTarget) && guidedTutorTarget.kind === 'login_form'
              ? guidedTutorTarget.authMode === 'create-account'
                ? tutorContent.guidedCallout.authDetails.createAccountForm
                : tutorContent.guidedCallout.authDetails.signInForm
              : isAuthGuidedTutorTarget(guidedTutorTarget) &&
                  guidedTutorTarget.authMode === 'create-account'
                ? tutorContent.guidedCallout.authDetails.createAccountNav
                : isAuthGuidedTutorTarget(guidedTutorTarget)
                  ? tutorContent.guidedCallout.authDetails.signInNav
                  : null;

  const guidedCalloutStepLabel =
    guidedMode === 'home_onboarding' &&
    homeOnboardingStepIndex !== null &&
    homeOnboardingSteps.length > 0
      ? formatKangurAiTutorTemplate(tutorContent.homeOnboarding.stepLabelTemplate, {
        current: homeOnboardingStepIndex + 1,
        total: homeOnboardingSteps.length,
      })
      : null;

  const guidedSelectionPreview = showSelectionGuidanceCallout
    ? (isSelectionGuidedTutorTarget(guidedTutorTarget)
      ? guidedTutorTarget.selectedText
      : (selectionResponsePending?.selectedText ?? '')
    ).slice(0, 120)
    : null;

  const guidedSectionRect = isSectionGuidedTutorTarget(guidedTutorTarget)
    ? cloneRect(guidedSectionAnchor?.getRect())
    : null;

  const guidedSectionFocusRect = showSectionGuidanceCallout
    ? isSectionGuidedTutorTarget(guidedTutorTarget)
      ? guidedSectionRect
      : activeSectionRect
    : null;

  const hoveredSectionProtectedRect = hoveredSectionAnchor
    ? getExpandedRect(
      hoveredSectionAnchor.getRect(),
      SECTION_DROP_TARGET_PADDING_X,
      SECTION_DROP_TARGET_PADDING_Y
    )
    : null;

  useEffect(() => {
    if (
      !isAuthGuidedTutorTarget(guidedTutorTarget) ||
      guidedTargetAnchor ||
      guidedFallbackRect ||
      typeof document === 'undefined'
    ) {
      return;
    }

    let frameId = 0;
    let attemptCount = 0;

    const pollForAuthAnchor = (): void => {
      const fallbackAnchor = document.querySelector<HTMLElement>(
        `[data-kangur-tutor-anchor-surface="auth"][data-kangur-tutor-anchor-kind="${guidedTutorTarget.kind}"]`
      );

      if (fallbackAnchor) {
        setAuthGuidedAnchorRetryTick((current) => current + 1);
        return;
      }

      attemptCount += 1;
      if (attemptCount >= 24) {
        return;
      }

      frameId = window.requestAnimationFrame(pollForAuthAnchor);
    };

    frameId = window.requestAnimationFrame(pollForAuthAnchor);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [guidedFallbackRect, guidedTargetAnchor, guidedTutorTarget]);

  useEffect(() => {
    if (!isAuthGuidedTutorTarget(guidedTutorTarget) || typeof document === 'undefined') {
      return;
    }

    const anchorElement = guidedTargetAnchor
      ? document.querySelector<HTMLElement>(
        `[data-kangur-tutor-anchor-id="${guidedTargetAnchor.id}"]`
      )
      : document.querySelector<HTMLElement>(
        `[data-kangur-tutor-anchor-surface="auth"][data-kangur-tutor-anchor-kind="${guidedTutorTarget.kind}"]`
      );

    if (!anchorElement || typeof anchorElement.scrollIntoView !== 'function') {
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
  }, [guidedFallbackRect, guidedTargetAnchor?.id, guidedTutorTarget]);

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
      const shouldPreferTopAlignment = window.innerWidth < sheetBreakpoint;
      anchorElement.scrollIntoView({
        behavior: getMotionSafeScrollBehavior('smooth'),
        block: shouldPreferTopAlignment ? 'start' : 'center',
        inline: 'nearest',
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [homeOnboardingAnchor?.id, sheetBreakpoint]);

  const guidedCalloutKey =
    guidedMode === 'home_onboarding'
      ? `guided-callout:home:${homeOnboardingStep?.id ?? 'step'}`
      : showSectionGuidanceCallout
        ? `guided-callout:section:${guidedTutorTarget?.kind ?? 'section'}`
        : showSelectionGuidanceCallout
          ? 'guided-callout:selection'
          : `guided-callout:${isAuthGuidedTutorTarget(guidedTutorTarget) ? guidedTutorTarget.authMode : 'auth'}`;

  const guidedCalloutTestId =
    guidedMode === 'home_onboarding'
      ? 'kangur-ai-tutor-home-onboarding'
      : showSectionGuidanceCallout
        ? 'kangur-ai-tutor-section-guided-callout'
        : showSelectionGuidanceCallout
          ? 'kangur-ai-tutor-selection-guided-callout'
          : 'kangur-ai-tutor-guided-login-help';

  const guidedCalloutHeaderLabel =
    guidedMode === 'home_onboarding'
      ? tutorContent.homeOnboarding.calloutHeaderLabel
      : showSelectionGuidanceCallout || showSectionGuidanceCallout
        ? `${tutorName.trim() || 'Tutor'}${tutorContent.guidedCallout.explanationHeaderSuffix}`
        : guestTutorAssistantLabel;

  const sectionResponsePendingKind = showSectionGuidanceCallout
    ? sectionResponsePending?.kind ?? null
    : null;

  return {
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
    guidedSelectionGlowRects,
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
  };
}
