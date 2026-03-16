'use client';

import { useCallback, useMemo } from 'react';

import { KANGUR_BASE_PATH } from '@/features/kangur/config/routing';
import {
  KANGUR_NARRATOR_SETTINGS_KEY,
  parseKangurNarratorSettings,
} from '@/features/kangur/settings';
import type {
  KangurAiTutorHintDepth,
  KangurAiTutorHomeOnboardingMode,
  KangurAiTutorLearnerSettings,
  KangurAiTutorProactiveNudges,
  KangurAiTutorUiMode,
} from '@/features/kangur/settings-ai-tutor';
import { resolveKangurAiTutorMotionPresetKind } from '@/features/kangur/settings-ai-tutor';
import type { KangurTutorAnchorRegistration } from '@/features/kangur/ui/context/kangur-tutor-types';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  useOptionalKangurTutorAnchors,
} from '@/features/kangur/ui/context/KangurTutorAnchorContext';
import { useKangurTextHighlight } from '@/features/kangur/ui/hooks/useKangurTextHighlight';
import type {
  KangurAiTutorConversationContext,
  KangurAiTutorMotionPresetKind,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorContent } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import type { KangurAuthMode } from '@/features/kangur/shared/contracts/kangur-auth';
import {
  useOptionalContextRegistryPageEnvelope,
  useRegisterContextRegistryPageSource,
} from '@/shared/lib/ai-context-registry/page-context';
import { buildContextRegistryConsumerEnvelope } from '@/shared/lib/ai-context-registry/page-context-shared';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';

import { isSelectionWithinTutorUi } from './KangurAiTutorWidget.coordinator.helpers';
import {
  cloneRect,
  getExpandedRect,
  getPageRect,
  getViewportRectFromPageRect,
  isSectionExplainableTutorAnchor,
} from './KangurAiTutorWidget.helpers';
import {
  DESKTOP_BUBBLE_WIDTH,
  MOBILE_BUBBLE_WIDTH,
  type TutorMotionProfile,
} from './KangurAiTutorWidget.shared';

import type { KangurAiTutorWidgetState } from './KangurAiTutorWidget.state';
import type {
  GuidedTutorSectionKind,
  TutorSurface,
} from './KangurAiTutorWidget.types';

const KANGUR_AI_TUTOR_NARRATOR_CONTEXT_ROOT_IDS = [
  'component:kangur-ai-tutor-narrator',
  'action:kangur-ai-tutor-tts',
] as const;

const SELECTION_PROTECTED_ZONE_PADDING_X = 140;
const SELECTION_PROTECTED_ZONE_PADDING_Y = 96;
const SECTION_DROP_TARGET_PADDING_X = 18;
const SECTION_DROP_TARGET_PADDING_Y = 18;

type AuthState = {
  isAuthenticated?: boolean;
  isLoadingAuth?: boolean;
  user?: {
    ownerEmailVerified?: boolean;
  } | null;
} | null | undefined;

type TutorSettings = KangurAiTutorLearnerSettings | null | undefined;

type UsageSummary = {
  remainingMessages: number | null;
} | null | undefined;

type UseKangurAiTutorWidgetEnvironmentInput = {
  authState: AuthState;
  highlightedText: string | null | undefined;
  mounted: boolean;
  sessionContext: KangurAiTutorConversationContext | null | undefined;
  tutorContent: KangurAiTutorContent;
  tutorSettings: TutorSettings;
  usageSummary: UsageSummary;
  widgetState: KangurAiTutorWidgetState;
  guestIntroMode: 'every_visit' | 'first_visit';
  homeOnboardingMode: KangurAiTutorHomeOnboardingMode;
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
): KangurAuthMode | null => {
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

const getMotionPresetKind = (
  motionPresetId: string | null | undefined
): KangurAiTutorMotionPresetKind => resolveKangurAiTutorMotionPresetKind(motionPresetId);

const withMotionCompletionDelay = (
  profile: Omit<TutorMotionProfile, 'motionCompletedDelayMs'>
): TutorMotionProfile => ({
  ...profile,
  // Keep motion-driven state changes behind the full guided handoff so
  // the docked tutor does not surface while the avatar is still traveling.
  motionCompletedDelayMs: Math.ceil(profile.guidedAvatarTransition.duration * 1000),
});

const getTutorMotionProfile = (motionPresetId: string | null | undefined): TutorMotionProfile => {
  switch (getMotionPresetKind(motionPresetId)) {
    case 'mobile':
      return withMotionCompletionDelay({
        kind: 'mobile',
        sheetBreakpoint: 840,
        avatarTransition: { type: 'spring', stiffness: 250, damping: 30 },
        guidedAvatarTransition: { type: 'tween', duration: 0.72, ease: [0.22, 1, 0.36, 1] },
        bubbleTransition: { type: 'spring', stiffness: 235, damping: 30 },
        hoverScale: 1.03,
        tapScale: 0.97,
        desktopBubbleWidth: 360,
        mobileBubbleWidth: 320,
      });
    case 'tablet':
      return withMotionCompletionDelay({
        kind: 'tablet',
        sheetBreakpoint: 960,
        avatarTransition: { type: 'spring', stiffness: 280, damping: 30 },
        guidedAvatarTransition: { type: 'tween', duration: 0.66, ease: [0.22, 1, 0.36, 1] },
        bubbleTransition: { type: 'spring', stiffness: 250, damping: 30 },
        hoverScale: 1.04,
        tapScale: 0.96,
        desktopBubbleWidth: 408,
        mobileBubbleWidth: 336,
      });
    case 'desktop':
      return withMotionCompletionDelay({
        kind: 'desktop',
        sheetBreakpoint: 680,
        avatarTransition: { type: 'spring', stiffness: 320, damping: 28 },
        guidedAvatarTransition: { type: 'tween', duration: 0.58, ease: [0.22, 1, 0.36, 1] },
        bubbleTransition: { type: 'spring', stiffness: 300, damping: 28 },
        hoverScale: 1.06,
        tapScale: 0.94,
        desktopBubbleWidth: 392,
        mobileBubbleWidth: 320,
      });
    default:
      return withMotionCompletionDelay({
        kind: 'default',
        sheetBreakpoint: 640,
        avatarTransition: { type: 'spring', stiffness: 320, damping: 28 },
        guidedAvatarTransition: { type: 'tween', duration: 0.58, ease: [0.22, 1, 0.36, 1] },
        bubbleTransition: { type: 'spring', stiffness: 300, damping: 28 },
        hoverScale: 1.06,
        tapScale: 0.94,
        desktopBubbleWidth: DESKTOP_BUBBLE_WIDTH,
        mobileBubbleWidth: MOBILE_BUBBLE_WIDTH,
      });
  }
};

const getTutorSessionKey = (
  sessionContext: KangurAiTutorConversationContext | null | undefined
): string | null => {
  if (!sessionContext) {
    return null;
  }

  return `${sessionContext.surface}:${sessionContext.contentId ?? sessionContext.title ?? 'none'}`;
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

export function useKangurAiTutorWidgetEnvironment({
  authState,
  highlightedText,
  mounted,
  sessionContext,
  tutorContent,
  tutorSettings,
  usageSummary,
  widgetState,
  guestIntroMode,
  homeOnboardingMode,
}: UseKangurAiTutorWidgetEnvironmentInput) {
  const settingsStore = useSettingsStore();
  const pageContextRegistry = useOptionalContextRegistryPageEnvelope();
  const textHighlightState = useKangurTextHighlight();
  const {
    activateSelectionGlow = () => false,
    selectionLineRects = [],
    selectedText,
    selectionRect,
    selectionContainerRect,
    clearSelection,
    clearSelectionGlow = () => {},
    selectionGlowSupported = false,
  } = textHighlightState;
  const tutorAnchorContext = useOptionalKangurTutorAnchors();
  const routing = useOptionalKangurRouting();
  const rawNarratorSettings = settingsStore.get(KANGUR_NARRATOR_SETTINGS_KEY);

  const {
    dismissedSelectedText,
    guestIntroHelpVisible,
    guestIntroVisible,
    highlightedSection,
    isTutorHidden,
    mounted: widgetMounted,
    persistedSelectionContainerRect,
    persistedSelectionPageRect,
    persistedSelectionPageRects,
    persistedSelectionRect,
    selectionConversationContext,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionPageRects,
    setPersistedSelectionRect,
    viewportTick,
  } = widgetState;

  const resolveGuestLoginGuidanceIntentForContent = useCallback(
    (value: string): KangurAuthMode | null =>
      resolveGuestLoginGuidanceIntent(value, tutorContent.guestIntro.intentPhrases),
    [tutorContent.guestIntro.intentPhrases]
  );

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

  useRegisterContextRegistryPageSource(
    'kangur-ai-tutor-narrator',
    useMemo(
      () => ({
        label: tutorContent.narrator.registrySourceLabel,
        rootNodeIds: [...KANGUR_AI_TUTOR_NARRATOR_CONTEXT_ROOT_IDS],
      }),
      [tutorContent.narrator.registrySourceLabel]
    )
  );

  const uiMode: KangurAiTutorUiMode = tutorSettings?.uiMode ?? 'anchored';
  const allowCrossPagePersistence = tutorSettings?.allowCrossPagePersistence ?? true;
  const allowSelectedTextSupport = tutorSettings?.allowSelectedTextSupport ?? true;
  const showSources = tutorSettings?.showSources ?? true;
  const proactiveNudges: KangurAiTutorProactiveNudges =
    tutorSettings?.proactiveNudges ?? 'gentle';
  const hintDepth: KangurAiTutorHintDepth = tutorSettings?.hintDepth ?? 'guided';
  const shouldRepeatGuestIntroOnEntry = guestIntroMode === 'every_visit';
  const shouldRepeatHomeOnboardingOnEntry = homeOnboardingMode === 'every_visit';
  const shouldIgnoreLiveTutorSelection =
    allowSelectedTextSupport && selectedText !== null && isSelectionWithinTutorUi();
  const liveSelectedText = shouldIgnoreLiveTutorSelection ? null : selectedText;
  const liveSelectionLineRects = shouldIgnoreLiveTutorSelection ? [] : selectionLineRects;
  const liveSelectionRect = shouldIgnoreLiveTutorSelection ? null : selectionRect;
  const liveSelectionContainerRect = shouldIgnoreLiveTutorSelection ? null : selectionContainerRect;

  const rawSelectedText = allowSelectedTextSupport
    ? (liveSelectedText ?? selectionConversationContext?.selectedText ?? highlightedText)?.trim() ||
      null
    : null;
  const activeSelectedText =
    rawSelectedText && rawSelectedText === dismissedSelectedText ? null : rawSelectedText;
  const liveSelectionPageRect = liveSelectionRect ? getPageRect(liveSelectionRect) : null;
  const liveSelectionPageRects = liveSelectionLineRects
    .map((rect) => getPageRect(rect))
    .filter((rect): rect is DOMRect => rect !== null);
  const activeSelectionRect = activeSelectedText
    ? (liveSelectionRect ??
      getViewportRectFromPageRect(persistedSelectionPageRect) ??
      persistedSelectionRect)
    : null;
  const activeSelectionPageRect = activeSelectedText
    ? (liveSelectionPageRect ?? persistedSelectionPageRect)
    : null;
  const activeSelectionPageRects = activeSelectedText
    ? (liveSelectionPageRects.length > 0 ? liveSelectionPageRects : persistedSelectionPageRects)
    : [];
  const activeSelectionContainerRect = activeSelectedText
    ? (liveSelectionContainerRect ?? persistedSelectionContainerRect)
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
  const canSendMessages = remainingMessages !== 0;
  const basePath = routing?.basePath ?? KANGUR_BASE_PATH;
  const isAnonymousVisitor = Boolean(
    mounted && authState && !authState.isLoadingAuth && !authState.isAuthenticated
  );
  const shouldRenderGuestIntroUi =
    !isTutorHidden && isAnonymousVisitor && (guestIntroVisible || guestIntroHelpVisible);
  const telemetryContext = {
    surface: sessionContext?.surface ?? null,
    contentId: sessionContext?.contentId ?? null,
    title: sessionContext?.title ?? null,
  };

  const persistSelectionGeometry = useCallback((): void => {
    if (liveSelectionRect) {
      setPersistedSelectionRect(cloneRect(liveSelectionRect));
      setPersistedSelectionPageRect(getPageRect(liveSelectionRect));
    }

    setPersistedSelectionPageRects(liveSelectionPageRects.map((rect) => cloneRect(rect) as DOMRect));

    if (liveSelectionContainerRect) {
      setPersistedSelectionContainerRect(cloneRect(liveSelectionContainerRect));
    }
  }, [
    liveSelectionContainerRect,
    liveSelectionPageRects,
    liveSelectionRect,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionPageRects,
    setPersistedSelectionRect,
  ]);

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
  const viewport = useMemo(() => getViewport(), [widgetMounted, viewportTick]);
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

  return {
    activeSectionProtectedRect,
    activeSectionRect,
    activeSelectedText,
    activeSelectionContainerRect,
    activeSelectionPageRect,
    activeSelectionPageRects,
    activeSelectionProtectedRect,
    activeSelectionRect,
    allowCrossPagePersistence,
    allowSelectedTextSupport,
    activateSelectionGlow,
    basePath,
    canSendMessages,
    clearSelection,
    clearSelectionGlow,
    hasAssignmentSummary,
    hasCurrentQuestion,
    hintDepth,
    homeOnboardingMode,
    isAnonymousVisitor,
    isAuthenticatedVisitor,
    motionProfile,
    narratorSettings,
    proactiveNudges,
    rawSelectedText,
    reducedMotionTransitions,
    remainingMessages,
    resolveGuestLoginGuidanceIntentForContent,
    routing,
    selectionGlowSupported,
    selectionLineRects: liveSelectionLineRects,
    selectionContainerRect: liveSelectionContainerRect,
    selectedText: liveSelectedText,
    selectionRect: liveSelectionRect,
    shouldRenderGuestIntroUi,
    shouldRepeatGuestIntroOnEntry,
    shouldRepeatHomeOnboardingOnEntry,
    showSources,
    telemetryContext,
    tutorAnchorContext,
    tutorNarratorContextRegistry,
    tutorSessionKey,
    uiMode,
    usageSummary,
    viewport,
    persistSelectionGeometry,
  };
}
