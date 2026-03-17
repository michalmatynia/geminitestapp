'use client';

import { useMemo, type MutableRefObject } from 'react';

import {
  useKangurAiTutorFocusTelemetryEffect,
  useKangurAiTutorSupplementalTelemetryEffects,
} from './KangurAiTutorWidget.effects';

import type { TutorProactiveNudge } from './KangurAiTutorPanelBody.context';
import type { ActiveTutorFocus, TutorMotionProfile } from './KangurAiTutorWidget.shared';
import type {
  KangurAiTutorSessionContextTelemetryDto,
  KangurAiTutorTelemetryContextDto,
  KangurAiTutorUsageSummary,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';

const getFocusTelemetryKey = (
  sessionKey: string | null,
  focus: ActiveTutorFocus
): string | null => {
  if (!sessionKey || !focus.kind) {
    return null;
  }

  return `${sessionKey}:${focus.kind}:${focus.id ?? 'none'}`;
};

export function useKangurAiTutorTelemetryBridge(input: {
  activeFocus: ActiveTutorFocus;
  activeSelectedText: string | null;
  bridgeQuickActionId: string | null;
  bubbleMode: 'bubble' | 'sheet';
  hintDepth: string;
  isOpen: boolean;
  lastTrackedFocusKeyRef: MutableRefObject<string | null>;
  lastTrackedProactiveNudgeKeyRef: MutableRefObject<string | null>;
  lastTrackedQuotaKeyRef: MutableRefObject<string | null>;
  motionProfile: Pick<TutorMotionProfile, 'motionCompletedDelayMs'>;
  motionTimeoutRef: MutableRefObject<number | null>;
  prefersReducedMotion: boolean;
  proactiveNudges: 'off' | 'gentle' | 'coach';
  sessionContext: KangurAiTutorSessionContextTelemetryDto;
  setPanelMotionState: (value: 'animating' | 'settled') => void;
  telemetryContext: KangurAiTutorTelemetryContextDto;
  tutorSessionKey: string | null;
  usageSummary: KangurAiTutorUsageSummary | null | undefined;
  visibleProactiveNudge: TutorProactiveNudge | null;
}) {
  const {
    activeFocus,
    activeSelectedText,
    bridgeQuickActionId,
    bubbleMode,
    hintDepth,
    isOpen,
    lastTrackedFocusKeyRef,
    lastTrackedProactiveNudgeKeyRef,
    lastTrackedQuotaKeyRef,
    motionProfile,
    motionTimeoutRef,
    prefersReducedMotion,
    proactiveNudges,
    sessionContext,
    setPanelMotionState,
    telemetryContext,
    tutorSessionKey,
    usageSummary,
    visibleProactiveNudge,
  } = input;

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
        sessionContext.surface ?? 'unknown',
        sessionContext.contentId ?? sessionContext.title ?? 'none',
        activeFocus.id ?? activeFocus.kind ?? 'focus',
      ].join(':');

    return `${contextKey}:${visibleProactiveNudge.mode}:${visibleProactiveNudge.action.id}`;
  }, [
    activeFocus.id,
    activeFocus.kind,
    isOpen,
    sessionContext.contentId,
    sessionContext.surface,
    sessionContext.title,
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

  useKangurAiTutorSupplementalTelemetryEffects({
    activeSelectedText,
    bridgeQuickActionId,
    hintDepth,
    lastTrackedProactiveNudgeKeyRef,
    lastTrackedQuotaKeyRef,
    proactiveNudgeTelemetryKey,
    proactiveNudges,
    quotaExhaustedTelemetryKey,
    sessionContext: sessionContext,
    telemetryContext: telemetryContext,
    usageSummary,
    visibleProactiveNudge,
  });

  useKangurAiTutorFocusTelemetryEffect({
    activeFocus,
    activeSelectedText,
    bubbleMode,
    focusTelemetryKey,
    isOpen,
    lastTrackedFocusKeyRef,
    motionProfile,
    motionTimeoutRef,
    prefersReducedMotion,
    sessionContext: sessionContext,
    setPanelMotionState,
  });
}
