'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useTranslations } from 'next-intl';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurMobileInteractionScrollLock } from '@/features/kangur/ui/hooks/useKangurMobileInteractionScrollLock';
import type { ClockTrainingTaskPoolId } from './types';
import {
  DraggableClockFace,
  DraggableClockInteractionHint,
  DraggableClockLegend,
  DraggableClockSnapModeSwitch,
  DraggableClockSubmitArea,
  DraggableClockTimeDisplay,
  resolveDraggableClockChallengeRingColor,
  resolveDraggableClockSubmitButtonLabel,
} from './DraggableClock.parts';
import type { DraggableClockSubmitNextStep } from './DraggableClock.parts';
import {
  CHALLENGE_TIME_LIMIT_SECONDS,
  MINUTE_STEP_BY_MODE,
  applyHourAngleToCycleMinutes,
  applyMinuteAngleToCycleMinutes,
  cycleMinutesToDisplayHour,
  cycleMinutesToDisplayMinutes,
  cycleMinutesToHourAngle,
  cycleMinutesToMinuteAngle,
  type Feedback,
  type Hand,
  type MinuteSnapMode,
} from './clock-training-utils';

export type DraggableClockProps = {
  onSubmit: (hours: number, minutes: number) => void;
  showChallengeRing?: boolean;
  showHourHand?: boolean;
  showMinuteHand?: boolean;
  challengeTimeLeft?: number;
  challengeTimeLimit?: number;
  section?: ClockTrainingTaskPoolId;
  showTimeDisplay?: boolean;
  submitFeedback?: Feedback;
  submitFeedbackDetails?: string | null;
  submitFeedbackTitle?: string | null;
  submitNextStep?: 'next-stage' | 'next-task' | 'summary' | null;
  submitLocked?: boolean;
};

type ResolvedDraggableClockProps = {
  challengeTimeLeft: number;
  challengeTimeLimit: number;
  onSubmit: (hours: number, minutes: number) => void;
  section: ClockTrainingTaskPoolId;
  showChallengeRing: boolean;
  showHourHand: boolean;
  showMinuteHand: boolean;
  showTimeDisplay: boolean;
  submitFeedback: Feedback;
  submitFeedbackDetails: string | null;
  submitFeedbackTitle: string | null;
  submitLocked: boolean;
  submitNextStep: DraggableClockSubmitNextStep;
};

type DraggableClockPointerDownHandler = (event: ReactPointerEvent<SVGElement>) => void;

const resolveDraggableClockCoreProps = (
  props: DraggableClockProps
): Pick<
  ResolvedDraggableClockProps,
  'challengeTimeLeft' | 'challengeTimeLimit' | 'onSubmit' | 'section'
> => ({
  challengeTimeLeft: props.challengeTimeLeft ?? CHALLENGE_TIME_LIMIT_SECONDS,
  challengeTimeLimit: props.challengeTimeLimit ?? CHALLENGE_TIME_LIMIT_SECONDS,
  onSubmit: props.onSubmit,
  section: props.section ?? 'mixed',
});

const resolveDraggableClockVisualProps = (
  props: DraggableClockProps
): Pick<
  ResolvedDraggableClockProps,
  'showChallengeRing' | 'showHourHand' | 'showMinuteHand' | 'showTimeDisplay'
> => ({
  showChallengeRing: props.showChallengeRing ?? false,
  showHourHand: props.showHourHand ?? true,
  showMinuteHand: props.showMinuteHand ?? true,
  showTimeDisplay: props.showTimeDisplay ?? true,
});

const resolveDraggableClockFeedbackProps = (
  props: DraggableClockProps
): Pick<
  ResolvedDraggableClockProps,
  | 'submitFeedback'
  | 'submitFeedbackDetails'
  | 'submitFeedbackTitle'
  | 'submitLocked'
  | 'submitNextStep'
> => ({
  submitFeedback: props.submitFeedback ?? null,
  submitFeedbackDetails: props.submitFeedbackDetails ?? null,
  submitFeedbackTitle: props.submitFeedbackTitle ?? null,
  submitLocked: props.submitLocked ?? false,
  submitNextStep: props.submitNextStep ?? null,
});

const resolveDraggableClockProps = (
  props: DraggableClockProps
): ResolvedDraggableClockProps => ({
  ...resolveDraggableClockCoreProps(props),
  ...resolveDraggableClockVisualProps(props),
  ...resolveDraggableClockFeedbackProps(props),
});

const resolveDraggableClockAngle = ({
  event,
  svgRef,
}: {
  event: MouseEvent | PointerEvent;
  svgRef: React.RefObject<SVGSVGElement | null>;
}): number => {
  const svg = svgRef.current;
  if (!svg) {
    return 0;
  }

  const rect = svg.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = event.clientX - centerX;
  const dy = event.clientY - centerY;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
  if (angle < 0) {
    angle += 360;
  }
  return angle;
};

const releaseDraggableClockPointerCapture = ({
  activePointerIdRef,
  activePointerTargetRef,
}: {
  activePointerIdRef: React.RefObject<number | null>;
  activePointerTargetRef: React.RefObject<SVGElement | null>;
}): void => {
  const target = activePointerTargetRef.current;
  const activePointerId = activePointerIdRef.current;

  if (target && activePointerId !== null && target.hasPointerCapture?.(activePointerId)) {
    try {
      target.releasePointerCapture(activePointerId);
    } catch {
      // Ignore release failures from already-cleared pointer capture.
    }
  }

  activePointerTargetRef.current = null;
};

const canStartDraggableClockHand = ({
  hand,
  hourHandEnabled,
  minuteHandEnabled,
  submitLocked,
}: {
  hand: Hand;
  hourHandEnabled: boolean;
  minuteHandEnabled: boolean;
  submitLocked: boolean;
}): boolean => {
  if (submitLocked) {
    return false;
  }

  return (hand === 'hour' && hourHandEnabled) || (hand === 'minute' && minuteHandEnabled);
};

const updateDraggableClockCycleMinutes = ({
  angle,
  draggingHand,
  minuteStep,
  setCycleMinutes,
}: {
  angle: number;
  draggingHand: Hand;
  minuteStep: number;
  setCycleMinutes: React.Dispatch<React.SetStateAction<number>>;
}): void => {
  if (draggingHand === 'minute') {
    setCycleMinutes((previous) => applyMinuteAngleToCycleMinutes(previous, angle, minuteStep));
    return;
  }

  setCycleMinutes((previous) => applyHourAngleToCycleMinutes(previous, angle));
};

function useDraggableClockDragState({
  hourHandEnabled,
  lockMobileInteraction,
  minuteHandEnabled,
  minuteStep,
  setCycleMinutes,
  submitLocked,
  unlockMobileInteraction,
}: {
  hourHandEnabled: boolean;
  lockMobileInteraction: () => void;
  minuteHandEnabled: boolean;
  minuteStep: number;
  setCycleMinutes: React.Dispatch<React.SetStateAction<number>>;
  submitLocked: boolean;
  unlockMobileInteraction: () => void;
}): {
  activeHand: Hand | null;
  onHourPointerDown: DraggableClockPointerDownHandler;
  onMinutePointerDown: DraggableClockPointerDownHandler;
  svgRef: React.RefObject<SVGSVGElement | null>;
} {
  const [activeHand, setActiveHand] = useState<Hand | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingRef = useRef<Hand | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const activePointerTargetRef = useRef<SVGElement | null>(null);

  const stopDragging = useCallback(
    (pointerId?: number): void => {
      const activePointerId = activePointerIdRef.current;
      if (pointerId !== undefined && activePointerId !== null && pointerId !== activePointerId) {
        return;
      }

      releaseDraggableClockPointerCapture({
        activePointerIdRef,
        activePointerTargetRef,
      });
      activePointerIdRef.current = null;
      draggingRef.current = null;
      setActiveHand(null);
      unlockMobileInteraction();
    },
    [unlockMobileInteraction]
  );

  const startDragging = useCallback(
    (hand: Hand, event: ReactPointerEvent<SVGElement>): void => {
      if (
        !canStartDraggableClockHand({
          hand,
          hourHandEnabled,
          minuteHandEnabled,
          submitLocked,
        })
      ) {
        return;
      }

      event.preventDefault();
      activePointerIdRef.current = event.pointerId;
      activePointerTargetRef.current = event.currentTarget;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      draggingRef.current = hand;
      setActiveHand(hand);
      lockMobileInteraction();
    },
    [hourHandEnabled, lockMobileInteraction, minuteHandEnabled, submitLocked]
  );

  const onHourPointerDown = useCallback<DraggableClockPointerDownHandler>(
    (event) => {
      startDragging('hour', event);
    },
    [startDragging]
  );

  const onMinutePointerDown = useCallback<DraggableClockPointerDownHandler>(
    (event) => {
      startDragging('minute', event);
    },
    [startDragging]
  );

  const onMove = useCallback(
    (event: PointerEvent): void => {
      const draggingHand = draggingRef.current;
      if (!draggingHand || activePointerIdRef.current !== event.pointerId) {
        return;
      }
      if (event.cancelable) {
        event.preventDefault();
      }

      updateDraggableClockCycleMinutes({
        angle: resolveDraggableClockAngle({ event, svgRef }),
        draggingHand,
        minuteStep,
        setCycleMinutes,
      });
    },
    [minuteStep, setCycleMinutes]
  );

  const onUp = useCallback(
    (event: PointerEvent): void => {
      stopDragging(event.pointerId);
    },
    [stopDragging]
  );

  useEffect(() => {
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp, { passive: false });
    window.addEventListener('pointercancel', onUp, { passive: false });

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      stopDragging();
    };
  }, [onMove, onUp, stopDragging]);

  return {
    activeHand,
    onHourPointerDown,
    onMinutePointerDown,
    svgRef,
  };
}

export function DraggableClock(props: DraggableClockProps): React.JSX.Element {
  const {
    challengeTimeLeft,
    challengeTimeLimit,
    onSubmit,
    section,
    showChallengeRing,
    showHourHand,
    showMinuteHand,
    showTimeDisplay,
    submitFeedback,
    submitFeedbackDetails,
    submitFeedbackTitle,
    submitLocked,
    submitNextStep,
  } = resolveDraggableClockProps(props);
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const [cycleMinutes, setCycleMinutes] = useState(0);
  const [minuteSnapMode, setMinuteSnapMode] = useState<MinuteSnapMode>('5min');
  const { lock: lockMobileInteraction, unlock: unlockMobileInteraction } =
    useKangurMobileInteractionScrollLock();
  const minuteStep = MINUTE_STEP_BY_MODE[minuteSnapMode];
  const hourHandEnabled = section !== 'minutes';
  const minuteHandEnabled = section !== 'hours';
  const { activeHand, onHourPointerDown, onMinutePointerDown, svgRef } =
    useDraggableClockDragState({
      hourHandEnabled,
      lockMobileInteraction,
      minuteHandEnabled,
      minuteStep,
      setCycleMinutes,
      submitLocked,
      unlockMobileInteraction,
    });

  const displayMinutes = cycleMinutesToDisplayMinutes(cycleMinutes);
  const displayHour = cycleMinutesToDisplayHour(cycleMinutes);
  const hourAngle = cycleMinutesToHourAngle(cycleMinutes);
  const minuteAngle = cycleMinutesToMinuteAngle(cycleMinutes);

  const hourHandX = 100 + 48 * Math.cos((hourAngle - 90) * (Math.PI / 180));
  const hourHandY = 100 + 48 * Math.sin((hourAngle - 90) * (Math.PI / 180));
  const minuteHandX = 100 + 68 * Math.cos((minuteAngle - 90) * (Math.PI / 180));
  const minuteHandY = 100 + 68 * Math.sin((minuteAngle - 90) * (Math.PI / 180));
  const challengeRingRadius = 98;
  const challengeRingCircumference = 2 * Math.PI * challengeRingRadius;
  const challengeProgress = Math.max(
    0,
    Math.min(1, challengeTimeLeft / Math.max(1, challengeTimeLimit))
  );
  const challengeRingOffset = challengeRingCircumference * (1 - challengeProgress);
  const challengeRingColor = resolveDraggableClockChallengeRingColor(challengeProgress);
  const submitButtonLabel = resolveDraggableClockSubmitButtonLabel({
    submitFeedback,
    translations,
  });
  const handleSubmitClick = useCallback((): void => {
    onSubmit(displayHour, displayMinutes);
  }, [displayHour, displayMinutes, onSubmit]);

  return (
    <div className={`flex flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <DraggableClockTimeDisplay
        displayHour={displayHour}
        displayMinutes={displayMinutes}
        showTimeDisplay={showTimeDisplay}
      />
      <DraggableClockSnapModeSwitch
        isCoarsePointer={isCoarsePointer}
        minuteHandEnabled={minuteHandEnabled}
        minuteSnapMode={minuteSnapMode}
        setMinuteSnapMode={setMinuteSnapMode}
        showMinuteHand={showMinuteHand}
        translations={translations}
      />
      <DraggableClockInteractionHint
        section={section}
        showHourHand={showHourHand}
        showMinuteHand={showMinuteHand}
        submitFeedback={submitFeedback}
        submitNextStep={submitNextStep}
        translations={translations}
      />
      <DraggableClockFace
        activeHand={activeHand}
        challengeRingCircumference={challengeRingCircumference}
        challengeRingColor={challengeRingColor}
        challengeRingOffset={challengeRingOffset}
        hourHandEnabled={hourHandEnabled}
        hourHandX={hourHandX}
        hourHandY={hourHandY}
        minuteHandEnabled={minuteHandEnabled}
        minuteHandX={minuteHandX}
        minuteHandY={minuteHandY}
        onHourPointerDown={onHourPointerDown}
        onMinutePointerDown={onMinutePointerDown}
        showChallengeRing={showChallengeRing}
        showHourHand={showHourHand}
        showMinuteHand={showMinuteHand}
        svgRef={svgRef}
      />
      <DraggableClockLegend
        showHourHand={showHourHand}
        showMinuteHand={showMinuteHand}
        translations={translations}
      />
      <DraggableClockSubmitArea
        onSubmitClick={handleSubmitClick}
        submitButtonLabel={submitButtonLabel}
        submitFeedback={submitFeedback}
        submitFeedbackDetails={submitFeedbackDetails}
        submitFeedbackTitle={submitFeedbackTitle}
        submitLocked={submitLocked}
      />
    </div>
  );
}
