import { useEffect, useLayoutEffect } from 'react';
import type { MutableRefObject } from 'react';
import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import type { TutorProactiveNudge } from '../KangurAiTutorPanelBody.context';
import type { KangurAiTutorSessionContextTelemetryDto, KangurAiTutorTelemetryContextDto, KangurAiTutorUsageSummary } from '@/features/kangur/shared/contracts/kangur-ai-tutor';

export function useSupplementalTelemetryEffects(input: {
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
    if (proactiveNudgeTelemetryKey === null || visibleProactiveNudge === null) {
      lastTrackedProactiveNudgeKeyRef.current = proactiveNudgeTelemetryKey;
      return;
    }

    if (lastTrackedProactiveNudgeKeyRef.current === proactiveNudgeTelemetryKey) return;

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
    activeSelectedText, bridgeQuickActionId, hintDepth, lastTrackedProactiveNudgeKeyRef,
    proactiveNudgeTelemetryKey, proactiveNudges, sessionContext.contentId, sessionContext.surface,
    sessionContext.title, visibleProactiveNudge,
  ]);

  useEffect(() => {
    if (quotaExhaustedTelemetryKey === null || !usageSummary) {
      lastTrackedQuotaKeyRef.current = quotaExhaustedTelemetryKey;
      return;
    }

    if (lastTrackedQuotaKeyRef.current === quotaExhaustedTelemetryKey) return;

    lastTrackedQuotaKeyRef.current = quotaExhaustedTelemetryKey;
    trackKangurClientEvent('kangur_ai_tutor_quota_exhausted', {
      ...telemetryContext,
      dateKey: usageSummary.dateKey,
      messageCount: usageSummary.messageCount,
      dailyMessageLimit: usageSummary.dailyMessageLimit,
      remainingMessages: usageSummary.remainingMessages,
    });
  }, [lastTrackedQuotaKeyRef, quotaExhaustedTelemetryKey, telemetryContext, usageSummary]);
}
