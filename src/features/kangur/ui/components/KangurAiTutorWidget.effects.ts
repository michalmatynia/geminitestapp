import { useEffect, useLayoutEffect, type MutableRefObject, type RefObject } from 'react';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import type { KangurAiTutorUsageSummary } from '@/shared/contracts/kangur-ai-tutor';

import { extractNarrationTextFromElement } from './kangur-narrator-utils';
import { areTutorSelectionTextsEquivalent } from './KangurAiTutorWidget.helpers';

import type { ActiveTutorFocus, TutorMotionProfile, TutorQuickAction } from './KangurAiTutorWidget.shared';
import type { PendingSelectionResponse, SectionExplainContext } from './KangurAiTutorWidget.types';
import type { KangurAiTutorRuntimeMessage } from '@/shared/contracts/kangur-ai-tutor';

type TelemetryContext = {
  surface: string | null;
  contentId: string | null;
  title: string | null;
};

type TutorProactiveNudge = {
  mode: 'gentle' | 'coach';
  title: string;
  description: string;
  action: TutorQuickAction;
};

type SessionContextTelemetry = {
  surface: string | null | undefined;
  contentId: string | null | undefined;
  title: string | null | undefined;
};

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
  telemetryContext: TelemetryContext;
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
    if (!selectionResponseComplete) {
      if (selectionResponseCompleteTimeoutRef.current !== null) {
        window.clearTimeout(selectionResponseCompleteTimeoutRef.current);
        selectionResponseCompleteTimeoutRef.current = null;
      }
      return;
    }

    if (selectionResponseCompleteTimeoutRef.current !== null) {
      window.clearTimeout(selectionResponseCompleteTimeoutRef.current);
    }

    selectionResponseCompleteTimeoutRef.current = window.setTimeout(() => {
      selectionResponseCompleteTimeoutRef.current = null;
      setSelectionResponseComplete(null);
    }, 4200);

    return () => {
      if (selectionResponseCompleteTimeoutRef.current !== null) {
        window.clearTimeout(selectionResponseCompleteTimeoutRef.current);
        selectionResponseCompleteTimeoutRef.current = null;
      }
    };
  }, [selectionResponseComplete, selectionResponseCompleteTimeoutRef, setSelectionResponseComplete]);

  useEffect(() => {
    if (!sectionResponseComplete) {
      if (sectionResponseCompleteTimeoutRef.current !== null) {
        window.clearTimeout(sectionResponseCompleteTimeoutRef.current);
        sectionResponseCompleteTimeoutRef.current = null;
      }
      return;
    }

    if (sectionResponseCompleteTimeoutRef.current !== null) {
      window.clearTimeout(sectionResponseCompleteTimeoutRef.current);
    }

    sectionResponseCompleteTimeoutRef.current = window.setTimeout(() => {
      sectionResponseCompleteTimeoutRef.current = null;
      setSectionResponseComplete(null);
    }, 4200);

    return () => {
      if (sectionResponseCompleteTimeoutRef.current !== null) {
        window.clearTimeout(sectionResponseCompleteTimeoutRef.current);
        sectionResponseCompleteTimeoutRef.current = null;
      }
    };
  }, [sectionResponseComplete, sectionResponseCompleteTimeoutRef, setSectionResponseComplete]);

  useEffect(() => {
    if (activeSelectedText) {
      return;
    }

    if (selectionResponseCompleteTimeoutRef.current !== null) {
      window.clearTimeout(selectionResponseCompleteTimeoutRef.current);
      selectionResponseCompleteTimeoutRef.current = null;
    }
    setSelectionResponseComplete(null);
  }, [activeSelectedText, selectionResponseCompleteTimeoutRef, setSelectionResponseComplete]);

  useEffect(() => {
    if (highlightedSection) {
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
  sessionContext: SessionContextTelemetry;
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

  useEffect(() => {
    if (!isOpen || !focusTelemetryKey || !activeFocus.kind) {
      lastTrackedFocusKeyRef.current = null;
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
      surface: sessionContext.surface ?? null,
      contentId: sessionContext.contentId ?? null,
      title: sessionContext.title ?? null,
      anchorKind: activeFocus.kind,
      anchorId: activeFocus.id,
      layoutMode: bubbleMode,
      hasSelectedText: Boolean(activeSelectedText),
    });

    if (motionTimeoutRef.current !== null) {
      window.clearTimeout(motionTimeoutRef.current);
    }
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
      if (motionTimeoutRef.current !== null) {
        window.clearTimeout(motionTimeoutRef.current);
        motionTimeoutRef.current = null;
      }
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

export function useKangurAiTutorSupplementalTelemetryEffects(input: {
  activeSelectedText: string | null;
  bridgeQuickActionId: string | null;
  hintDepth: string;
  lastTrackedProactiveNudgeKeyRef: MutableRefObject<string | null>;
  lastTrackedQuotaKeyRef: MutableRefObject<string | null>;
  proactiveNudgeTelemetryKey: string | null;
  proactiveNudges: 'off' | 'gentle' | 'coach';
  quotaExhaustedTelemetryKey: string | null;
  sessionContext: SessionContextTelemetry;
  telemetryContext: TelemetryContext;
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
    if (!proactiveNudgeTelemetryKey || !visibleProactiveNudge) {
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
  }, [
    lastTrackedQuotaKeyRef,
    quotaExhaustedTelemetryKey,
    telemetryContext,
    usageSummary,
  ]);
}

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
    if (!shouldEnableTutorNarration) {
      setTutorNarrationObservedText('');
      return;
    }

    const rootRef =
      preferGuestIntroRoot && guestIntroNarrationRootRef
        ? guestIntroNarrationRootRef
        : tutorNarrationRootRef;
    const root = rootRef.current;
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
    observationKey,
    setTutorNarrationObservedText,
    shouldEnableTutorNarration,
    tutorNarrationRootRef,
    guestIntroNarrationRootRef,
    preferGuestIntroRoot,
  ]);
}
