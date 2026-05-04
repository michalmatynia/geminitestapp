import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import type { TutorMotionProfile, ActiveTutorFocus } from '../KangurAiTutorWidget.shared';
import type { KangurAiTutorSessionContextTelemetryDto } from '@/features/kangur/shared/contracts/kangur-ai-tutor';

export function useTutorFocusTelemetryEffect(input: {
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

  useEffect(() => {
    const clearMotionTimeout = (): void => {
      if (motionTimeoutRef.current !== null) {
        window.clearTimeout(motionTimeoutRef.current);
        motionTimeoutRef.current = null;
      }
    };

    if (!isOpen || focusTelemetryKey === null || activeFocus.kind === null) {
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
