'use client';

/* eslint-disable max-lines */

import { useEffect, useLayoutEffect, type MutableRefObject, type RefObject } from 'react';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import type {
  KangurAiTutorSessionContextTelemetryDto,
  KangurAiTutorTelemetryContextDto,
  KangurAiTutorUsageSummary,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import { safeClearTimeout, safeSetTimeout } from '@/shared/lib/timers';

import { extractNarrationTextFromElement } from '../kangur-narrator-utils';
import { areTutorSelectionTextsEquivalent } from './KangurAiTutorWidget.helpers';

import type { ActiveTutorFocus, TutorMotionProfile } from './KangurAiTutorWidget.shared';
import type { TutorProactiveNudge } from '../KangurAiTutorPanelBody.context';
import type { PendingSelectionResponse, SectionExplainContext } from './KangurAiTutorWidget.types';
import type { KangurAiTutorRuntimeMessage } from '@/features/kangur/shared/contracts/kangur-ai-tutor';

/* eslint-disable-next-line max-lines-per-function */
export function useKangurAiTutorGuidanceCompletionEffects(input: {
  activeSelectedText: string | null;
  contextualTutorMode: string | null;
  highlightedSection: SectionExplainContext | null;
  isLoading: boolean;
  isOpen: boolean;
  panelShellMode: string;
  isSectionGuidedMode: boolean;
  isSelectionGuidedMode: boolean;
  sectionResponseComplete: SectionExplainContext | null;
  sectionResponseCompleteTimeoutRef: MutableRefObject<number | null>;
  sectionResponsePending: SectionExplainContext | null;
  selectionConversationSelectedText: string | null;
  selectionConversationStartIndex: number | null;
  selectionGuidanceHandoffText: string | null;
  messages: KangurAiTutorRuntimeMessage[];
  selectionResponseComplete: PendingSelectionResponse | null;
  selectionResponseCompleteTimeoutRef: MutableRefObject<number | null>;
  selectionResponsePending: PendingSelectionResponse | null;
  setSectionResponseComplete: (value: SectionExplainContext | null) => void;
  setSectionResponsePending: (value: SectionExplainContext | null) => void;
  setSelectionGuidanceCalloutVisibleText: (value: string | null) => void;
  setSelectionResponseComplete: (value: PendingSelectionResponse | null) => void;
  setSelectionResponsePending: (value: PendingSelectionResponse | null) => void;
  telemetryContext: KangurAiTutorTelemetryContextDto;
}): void {
  const {
    activeSelectedText,
    contextualTutorMode,
    highlightedSection,
    isLoading,
    isOpen,
    panelShellMode,
    isSectionGuidedMode,
    isSelectionGuidedMode,
    sectionResponseComplete,
    sectionResponseCompleteTimeoutRef,
    sectionResponsePending,
    selectionConversationSelectedText,
    selectionConversationStartIndex,
    selectionGuidanceHandoffText,
    messages,
    selectionResponseComplete,
    selectionResponseCompleteTimeoutRef,
    selectionResponsePending,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionGuidanceCalloutVisibleText,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    telemetryContext,
  } = input;

  // eslint-disable-next-line complexity
  useEffect(() => {
    const selectionThreadMessages =
      selectionConversationStartIndex !== null
        ? messages.slice(selectionConversationStartIndex)
        : [];
    const latestSelectionResponseMessage =
      [...selectionThreadMessages].reverse().find((message) => message.role === 'assistant') ?? null;
    const hasSelectionResponseMessage = latestSelectionResponseMessage !== null;
    const isSelectionContextStillOwningMinimalPanel =
      contextualTutorMode === 'selection_explain' &&
      panelShellMode === 'minimal' &&
      areTutorSelectionTextsEquivalent(
        selectionConversationSelectedText,
        selectionResponsePending?.selectedText ?? null
      );
    const shouldRevealGuidedSelectionCallout =
      isSelectionGuidedMode &&
      hasSelectionResponseMessage;
    const shouldFinalizeSelectionPanel =
      !isSelectionGuidedMode &&
      isOpen &&
      selectionGuidanceHandoffText === null &&
      !isSelectionContextStillOwningMinimalPanel &&
      hasSelectionResponseMessage;

    if (
      !selectionResponsePending ||
      isLoading ||
      (!shouldRevealGuidedSelectionCallout && !shouldFinalizeSelectionPanel)
    ) {
      return;
    }

    trackKangurClientEvent('kangur_ai_tutor_selection_guidance_completed', {
      ...telemetryContext,
      selectionLength: selectionResponsePending.selectedText.length,
    });
    setSelectionResponseComplete({
      selectedText: selectionResponsePending.selectedText,
    });
    setSelectionResponsePending(null);
    if (shouldRevealGuidedSelectionCallout) {
      setSelectionGuidanceCalloutVisibleText(selectionResponsePending.selectedText);
    }
  }, [
    messages,
    isLoading,
    isOpen,
    panelShellMode,
    contextualTutorMode,
    isSelectionGuidedMode,
    selectionConversationSelectedText,
    selectionConversationStartIndex,
    selectionResponsePending,
    setSelectionGuidanceCalloutVisibleText,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    telemetryContext,
    selectionGuidanceHandoffText,
  ]);

  useEffect(() => {
    if (!sectionResponsePending || isLoading || isSectionGuidedMode || !isOpen) {
      return;
    }

    trackKangurClientEvent('kangur_ai_tutor_section_guidance_completed', {
      ...telemetryContext,
      sectionId: sectionResponsePending.anchorId,
      sectionKind: sectionResponsePending.kind,
      sectionLabel: sectionResponsePending.label,
    });
    setSectionResponseComplete(sectionResponsePending);
    setSectionResponsePending(null);
  }, [
    isLoading,
    isOpen,
    isSectionGuidedMode,
    sectionResponsePending,
    setSectionResponseComplete,
    setSectionResponsePending,
    telemetryContext,
  ]);

  useEffect(() => {
    const clearSelectionResponseCompleteTimeout = (): void => {
      if (selectionResponseCompleteTimeoutRef.current !== null) {
        window.clearTimeout(selectionResponseCompleteTimeoutRef.current);
        selectionResponseCompleteTimeoutRef.current = null;
      }
    };

    if (!selectionResponseComplete) {
      clearSelectionResponseCompleteTimeout();
      return clearSelectionResponseCompleteTimeout;
    }

    clearSelectionResponseCompleteTimeout();

    selectionResponseCompleteTimeoutRef.current = window.setTimeout(() => {
      selectionResponseCompleteTimeoutRef.current = null;
      setSelectionResponseComplete(null);
    }, 4200);

    return () => {
      clearSelectionResponseCompleteTimeout();
    };
  }, [selectionResponseComplete, selectionResponseCompleteTimeoutRef, setSelectionResponseComplete]);

  useEffect(() => {
    const clearSectionResponseCompleteTimeout = (): void => {
      if (sectionResponseCompleteTimeoutRef.current !== null) {
        window.clearTimeout(sectionResponseCompleteTimeoutRef.current);
        sectionResponseCompleteTimeoutRef.current = null;
      }
    };

    if (!sectionResponseComplete) {
      clearSectionResponseCompleteTimeout();
      return clearSectionResponseCompleteTimeout;
    }

    clearSectionResponseCompleteTimeout();

    sectionResponseCompleteTimeoutRef.current = window.setTimeout(() => {
      sectionResponseCompleteTimeoutRef.current = null;
      setSectionResponseComplete(null);
    }, 4200);

    return () => {
      clearSectionResponseCompleteTimeout();
    };
  }, [sectionResponseComplete, sectionResponseCompleteTimeoutRef, setSectionResponseComplete]);

  useEffect(() => {
    if (activeSelectedText !== null && activeSelectedText.length > 0) {
      return;
    }

    if (selectionResponseCompleteTimeoutRef.current !== null) {
      window.clearTimeout(selectionResponseCompleteTimeoutRef.current);
      selectionResponseCompleteTimeoutRef.current = null;
    }
    setSelectionResponseComplete(null);
  }, [activeSelectedText, selectionResponseCompleteTimeoutRef, setSelectionResponseComplete]);

  useEffect(() => {
    if (highlightedSection !== null) {
      return;
    }

    if (sectionResponseCompleteTimeoutRef.current !== null) {
      window.clearTimeout(sectionResponseCompleteTimeoutRef.current);
      sectionResponseCompleteTimeoutRef.current = null;
    }
    setSectionResponsePending(null);
    setSectionResponseComplete(null);
  }, [
    highlightedSection,
    sectionResponseCompleteTimeoutRef,
    setSectionResponseComplete,
    setSectionResponsePending,
  ]);
}

/* eslint-disable-next-line max-lines-per-function */
export function useKangurAiTutorFocusTelemetryEffect(input: {
  activeFocus: ActiveTutorFocus;
  activeSelectedText: string | null;
  bubbleMode: 'bubble' | 'sheet';
  focusTelemetryKey: string | null;
  isOpen: boolean;
  lastTrackedFocusKeyRef: MutableRefObject<string | null>;
  motionProfile: Pick<TutorMotionProfile, 'motionCompletedDelayMs'>;
  motionTimeoutRef: MutableRefObject<number | null>;
  prefersReducedMotion: boolean;
  sessionContext: KangurAiTutorSessionContextTelemetryDto;
  setPanelMotionState: (value: 'animating' | 'settled') => void;
}): void {
  const {
    activeFocus,
    activeSelectedText,
    bubbleMode,
    focusTelemetryKey,
    isOpen,
    lastTrackedFocusKeyRef,
    motionProfile,
    motionTimeoutRef,
    prefersReducedMotion,
    sessionContext,
    setPanelMotionState,
  } = input;

  // eslint-disable-next-line complexity
  useEffect(() => {
    const clearMotionTimeout = (): void => {
      if (motionTimeoutRef.current !== null) {
        window.clearTimeout(motionTimeoutRef.current);
        motionTimeoutRef.current = null;
      }
    };

    if (
      !isOpen ||
      focusTelemetryKey === null ||
      activeFocus.kind === null
    ) {
      lastTrackedFocusKeyRef.current = null;
      setPanelMotionState('settled');
      clearMotionTimeout();
      return clearMotionTimeout;
    }

    if (lastTrackedFocusKeyRef.current === focusTelemetryKey) {
      return clearMotionTimeout;
    }

    lastTrackedFocusKeyRef.current = focusTelemetryKey;
    setPanelMotionState('animating');
    trackKangurClientEvent('kangur_ai_tutor_anchor_changed', {
      surface: sessionContext.surface ?? null,
      contentId: sessionContext.contentId ?? null,
      title: sessionContext.title ?? null,
      anchorKind: activeFocus.kind,
      anchorId: activeFocus.id,
      layoutMode: bubbleMode,
      hasSelectedText: Boolean(activeSelectedText),
    });

    clearMotionTimeout();
    motionTimeoutRef.current = window.setTimeout(() => {
      setPanelMotionState('settled');
      trackKangurClientEvent('kangur_ai_tutor_motion_completed', {
        surface: sessionContext.surface ?? null,
        contentId: sessionContext.contentId ?? null,
        title: sessionContext.title ?? null,
        anchorKind: activeFocus.kind,
        anchorId: activeFocus.id,
        layoutMode: bubbleMode,
        hasSelectedText: Boolean(activeSelectedText),
      });
      motionTimeoutRef.current = null;
    }, prefersReducedMotion ? 0 : motionProfile.motionCompletedDelayMs);

    return () => {
      clearMotionTimeout();
    };
  }, [
    activeFocus.id,
    activeFocus.kind,
    activeSelectedText,
    bubbleMode,
    focusTelemetryKey,
    isOpen,
    lastTrackedFocusKeyRef,
    motionProfile.motionCompletedDelayMs,
    motionTimeoutRef,
    prefersReducedMotion,
    sessionContext.contentId,
    sessionContext.surface,
    sessionContext.title,
    setPanelMotionState,
  ]);
}

/* eslint-disable-next-line max-lines-per-function */
export function useKangurAiTutorSupplementalTelemetryEffects(input: {
  activeSelectedText: string | null;
  bridgeQuickActionId: string | null;
  hintDepth: string;
  lastTrackedProactiveNudgeKeyRef: MutableRefObject<string | null>;
  lastTrackedQuotaKeyRef: MutableRefObject<string | null>;
  proactiveNudgeTelemetryKey: string | null;
  proactiveNudges: 'off' | 'gentle' | 'coach';
  quotaExhaustedTelemetryKey: string | null;
  sessionContext: KangurAiTutorSessionContextTelemetryDto;
  telemetryContext: KangurAiTutorTelemetryContextDto;
  usageSummary: KangurAiTutorUsageSummary | null | undefined;
  visibleProactiveNudge: TutorProactiveNudge | null;
}): void {
  const {
    activeSelectedText,
    bridgeQuickActionId,
    hintDepth,
    lastTrackedProactiveNudgeKeyRef,
    lastTrackedQuotaKeyRef,
    proactiveNudgeTelemetryKey,
    proactiveNudges,
    quotaExhaustedTelemetryKey,
    sessionContext,
    telemetryContext,
    usageSummary,
    visibleProactiveNudge,
  } = input;

  useLayoutEffect(() => {
    if (
      proactiveNudgeTelemetryKey === null ||
      visibleProactiveNudge === null
    ) {
      lastTrackedProactiveNudgeKeyRef.current = proactiveNudgeTelemetryKey;
      return;
    }

    if (lastTrackedProactiveNudgeKeyRef.current === proactiveNudgeTelemetryKey) {
      return;
    }

    lastTrackedProactiveNudgeKeyRef.current = proactiveNudgeTelemetryKey;
    trackKangurClientEvent('kangur_ai_tutor_proactive_nudge_shown', {
      surface: sessionContext.surface ?? null,
      contentId: sessionContext.contentId ?? null,
      title: sessionContext.title ?? null,
      nudgeMode: proactiveNudges,
      actionId: visibleProactiveNudge.action.id,
      bridgeActionId: bridgeQuickActionId,
      isBridgeAction: visibleProactiveNudge.action.id === bridgeQuickActionId,
      hintDepth,
      hasSelectedText: Boolean(activeSelectedText),
    });
  }, [
    activeSelectedText,
    bridgeQuickActionId,
    hintDepth,
    lastTrackedProactiveNudgeKeyRef,
    proactiveNudgeTelemetryKey,
    proactiveNudges,
    sessionContext.contentId,
    sessionContext.surface,
    sessionContext.title,
    visibleProactiveNudge,
  ]);

  useEffect(() => {
    if (
      quotaExhaustedTelemetryKey === null ||
      usageSummary === null ||
      usageSummary === undefined
    ) {
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
  }, [
    lastTrackedQuotaKeyRef,
    quotaExhaustedTelemetryKey,
    telemetryContext,
    usageSummary,
  ]);
}

/* eslint-disable-next-line max-lines-per-function */
export function useKangurAiTutorNarrationObserverEffect(input: {
  observationKey: string;
  setTutorNarrationObservedText: (value: string) => void;
  shouldEnableTutorNarration: boolean;
  tutorNarrationRootRef: RefObject<HTMLDivElement | null>;
  guestIntroNarrationRootRef?: RefObject<HTMLDivElement | null>;
  preferGuestIntroRoot?: boolean;
}): void {
  const {
    observationKey,
    setTutorNarrationObservedText,
    shouldEnableTutorNarration,
    tutorNarrationRootRef,
    guestIntroNarrationRootRef,
    preferGuestIntroRoot,
  } = input;

  useLayoutEffect(() => {
    let timeoutId: number | null = null;

    const clearNarrationTimeout = (): void => {
      if (timeoutId !== null) {
        safeClearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    if (!shouldEnableTutorNarration) {
      setTutorNarrationObservedText('');
      return clearNarrationTimeout;
    }

    const rootRef =
      preferGuestIntroRoot === true && guestIntroNarrationRootRef !== undefined
        ? guestIntroNarrationRootRef
        : tutorNarrationRootRef;
    const root = rootRef.current;
    if (root === null) {
      setTutorNarrationObservedText('');
      return clearNarrationTimeout;
    }

    const updateText = (): void => {
      setTutorNarrationObservedText(extractNarrationTextFromElement(root));
    };

    const observer = new MutationObserver(() => {
      if (timeoutId !== null) {
        safeClearTimeout(timeoutId);
      }
      timeoutId = safeSetTimeout(updateText, 120);
    });

    updateText();

    if (typeof MutationObserver === 'undefined') {
      return clearNarrationTimeout;
    }

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      clearNarrationTimeout();
    };
  }, [
    observationKey,
    setTutorNarrationObservedText,
    shouldEnableTutorNarration,
    tutorNarrationRootRef,
    guestIntroNarrationRootRef,
    preferGuestIntroRoot,
  ]);
}
