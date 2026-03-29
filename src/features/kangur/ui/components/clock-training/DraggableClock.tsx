'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useTranslations } from 'next-intl';
import {
  KangurAccentDot,
  KangurButton,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
  KANGUR_WRAP_ROW_SPACED_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurMobileInteractionScrollLock } from '@/features/kangur/ui/hooks/useKangurMobileInteractionScrollLock';
import type { ClockTrainingTaskPoolId } from './types';
import {
  CHALLENGE_TIME_LIMIT_SECONDS,
  MINUTE_STEP_BY_MODE,
  applyHourAngleToCycleMinutes,
  applyMinuteAngleToCycleMinutes,
  cycleMinutesToDisplayHour,
  cycleMinutesToDisplayMinutes,
  cycleMinutesToHourAngle,
  cycleMinutesToMinuteAngle,
  pad,
  type Feedback,
  type Hand,
  type MinuteSnapMode,
} from '../clock-training-utils';
import { translateClockTrainingWithFallback } from '../clock-training-i18n';

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

type DraggableClockSubmitNextStep = 'next-stage' | 'next-task' | 'summary' | null;
type DraggableClockTranslations = ReturnType<typeof useTranslations>;
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

export const resolveDraggableClockChallengeRingColor = (challengeProgress: number): string => {
  if (challengeProgress <= 0.2) {
    return '#dc2626';
  }

  if (challengeProgress <= 0.5) {
    return '#f97316';
  }

  return '#f59e0b';
};

const resolveDraggableClockHandInteractionStyle = ({
  activeHand,
  enabled,
  hand,
}: {
  activeHand: Hand | null;
  enabled: boolean;
  hand: Hand;
}): React.CSSProperties => ({
  cursor: enabled ? (activeHand === hand ? 'grabbing' : 'grab') : 'not-allowed',
  opacity: enabled ? 1 : 0.45,
  touchAction: 'none',
});

export const resolveDraggableClockSubmitButtonLabel = ({
  submitFeedback,
  translations,
}: {
  submitFeedback: Feedback;
  translations: DraggableClockTranslations;
}): string => {
  if (submitFeedback === 'correct') {
    return translateClockTrainingWithFallback(
      translations,
      'submit.correct',
      'Dobrze! ✅'
    );
  }

  if (submitFeedback === 'wrong') {
    return translateClockTrainingWithFallback(
      translations,
      'submit.wrong',
      'Błąd! ❌'
    );
  }

  return translateClockTrainingWithFallback(
    translations,
    'submit.idle',
    'Sprawdź! ✅'
  );
};

const resolveDraggableClockSubmitButtonClassName = (
  submitFeedback: Feedback
): string =>
  cn(
    'w-full disabled:opacity-100 sm:w-auto',
    submitFeedback === 'correct' &&
      'border-emerald-500 bg-emerald-500 text-white hover:border-emerald-500 hover:bg-emerald-500',
    submitFeedback === 'wrong' &&
      'border-rose-500 bg-rose-500 text-white hover:border-rose-500 hover:bg-rose-500'
  );

const resolveDraggableClockFeedbackClassName = (submitFeedback: Feedback): string =>
  cn(
    'max-w-md rounded-3xl border px-4 py-3 text-center shadow-sm',
    submitFeedback === 'correct'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-rose-200 bg-rose-50 text-rose-800'
  );

const resolveDraggableClockCorrectInteractionHint = ({
  submitNextStep,
  translations,
}: {
  submitNextStep: DraggableClockSubmitNextStep;
  translations: DraggableClockTranslations;
}): string => {
  if (submitNextStep === 'summary') {
    return translateClockTrainingWithFallback(
      translations,
      'interactionHint.correct.summary',
      'Dobra odpowiedź. Za chwilę podsumowanie.'
    );
  }

  if (submitNextStep === 'next-stage') {
    return translateClockTrainingWithFallback(
      translations,
      'interactionHint.correct.nextStage',
      'Dobra odpowiedź. Za chwilę kolejny etap.'
    );
  }

  return translateClockTrainingWithFallback(
    translations,
    'interactionHint.correct.nextTask',
    'Dobra odpowiedź. Za chwilę następne zadanie.'
  );
};

const resolveDraggableClockWrongInteractionHint = ({
  submitNextStep,
  translations,
}: {
  submitNextStep: DraggableClockSubmitNextStep;
  translations: DraggableClockTranslations;
}): string => {
  if (submitNextStep === 'summary') {
    return translateClockTrainingWithFallback(
      translations,
      'interactionHint.wrong.summary',
      'Sprawdziliśmy odpowiedź. Za chwilę podsumowanie.'
    );
  }

  if (submitNextStep === 'next-stage') {
    return translateClockTrainingWithFallback(
      translations,
      'interactionHint.wrong.nextStage',
      'Sprawdziliśmy odpowiedź. Za chwilę kolejny etap.'
    );
  }

  return translateClockTrainingWithFallback(
    translations,
    'interactionHint.wrong.nextTask',
    'Sprawdziliśmy odpowiedź. Za chwilę następne zadanie.'
  );
};

const resolveDraggableClockInteractionHint = ({
  section,
  showHourHand,
  showMinuteHand,
  submitFeedback,
  submitNextStep,
  translations,
}: {
  section: ClockTrainingTaskPoolId;
  showHourHand: boolean;
  showMinuteHand: boolean;
  submitFeedback: Feedback;
  submitNextStep: DraggableClockSubmitNextStep;
  translations: DraggableClockTranslations;
}): string | null => {
  if (submitFeedback === 'correct') {
    return resolveDraggableClockCorrectInteractionHint({ submitNextStep, translations });
  }

  if (submitFeedback === 'wrong') {
    return resolveDraggableClockWrongInteractionHint({ submitNextStep, translations });
  }

  if (section === 'minutes' || section === 'hours' || !showHourHand || !showMinuteHand) {
    return null;
  }

  return translateClockTrainingWithFallback(
    translations,
    'interactionHint.idle.mixed',
    'Wskazówka godzin przesuwa się płynnie razem z minutami.'
  );
};

export function DraggableClockTimeDisplay({
  displayHour,
  displayMinutes,
  showTimeDisplay,
}: {
  displayHour: number;
  displayMinutes: number;
  showTimeDisplay: boolean;
}): React.JSX.Element | null {
  if (!showTimeDisplay) {
    return null;
  }

  return (
    <KangurStatusChip
      accent='indigo'
      className='px-5 py-2 text-2xl font-extrabold'
      data-testid='clock-time-display'
    >
      {displayHour}:{pad(displayMinutes)}
    </KangurStatusChip>
  );
}

export function DraggableClockSnapModeSwitch({
  isCoarsePointer,
  minuteHandEnabled,
  minuteSnapMode,
  setMinuteSnapMode,
  showMinuteHand,
  translations,
}: {
  isCoarsePointer: boolean;
  minuteHandEnabled: boolean;
  minuteSnapMode: MinuteSnapMode;
  setMinuteSnapMode: React.Dispatch<React.SetStateAction<MinuteSnapMode>>;
  showMinuteHand: boolean;
  translations: DraggableClockTranslations;
}): React.JSX.Element | null {
  if (!showMinuteHand || !minuteHandEnabled) {
    return null;
  }

  return (
    <div
      className={cn(
        KANGUR_SEGMENTED_CONTROL_CLASSNAME,
        'w-full sm:w-auto sm:flex-wrap sm:justify-center'
      )}
      data-testid='clock-snap-mode-switch'
    >
      <KangurButton
        type='button'
        data-testid='clock-snap-mode-5'
        onClick={() => setMinuteSnapMode('5min')}
        className={cn(
          'h-10 flex-1 px-3.5 text-xs touch-manipulation select-none sm:flex-none',
          isCoarsePointer && 'min-h-12 active:scale-[0.98]'
        )}
        size='sm'
        variant={minuteSnapMode === '5min' ? 'segmentActive' : 'segment'}
      >
        {translateClockTrainingWithFallback(
          translations,
          'snapMode.step5',
          'Skok co 5 min'
        )}
      </KangurButton>
      <KangurButton
        type='button'
        data-testid='clock-snap-mode-1'
        onClick={() => setMinuteSnapMode('1min')}
        className={cn(
          'h-10 flex-1 px-3.5 text-xs touch-manipulation select-none sm:flex-none',
          isCoarsePointer && 'min-h-12 active:scale-[0.98]'
        )}
        size='sm'
        variant={minuteSnapMode === '1min' ? 'segmentActive' : 'segment'}
      >
        {translateClockTrainingWithFallback(
          translations,
          'snapMode.step1',
          'Dokładnie co 1 min'
        )}
      </KangurButton>
    </div>
  );
}

export function DraggableClockInteractionHint({
  section,
  showHourHand,
  showMinuteHand,
  submitFeedback,
  submitNextStep,
  translations,
}: {
  section: ClockTrainingTaskPoolId;
  showHourHand: boolean;
  showMinuteHand: boolean;
  submitFeedback: Feedback;
  submitNextStep: DraggableClockSubmitNextStep;
  translations: DraggableClockTranslations;
}): React.JSX.Element | null {
  const interactionHint = resolveDraggableClockInteractionHint({
    section,
    showHourHand,
    showMinuteHand,
    submitFeedback,
    submitNextStep,
    translations,
  });

  if (!interactionHint) {
    return null;
  }

  return (
    <p
      className='text-xs [color:var(--kangur-page-muted-text)]'
      data-testid='clock-interaction-hint'
    >
      {interactionHint}
    </p>
  );
}

function DraggableClockChallengeRing({
  challengeRingCircumference,
  challengeRingOffset,
  challengeRingColor,
}: {
  challengeRingCircumference: number;
  challengeRingOffset: number;
  challengeRingColor: string;
}): React.JSX.Element {
  return (
    <>
      <circle
        data-testid='clock-challenge-ring-track'
        cx='100'
        cy='100'
        r='98'
        fill='none'
        stroke='#fde68a'
        strokeWidth='6'
        strokeLinecap='round'
      />
      <circle
        data-testid='clock-challenge-ring'
        cx='100'
        cy='100'
        r='98'
        fill='none'
        stroke={challengeRingColor}
        strokeWidth='6'
        strokeLinecap='round'
        strokeDasharray={challengeRingCircumference}
        strokeDashoffset={challengeRingOffset}
        transform='rotate(-90 100 100)'
        style={{ transition: 'stroke-dashoffset 0.85s linear, stroke 0.2s ease' }}
      />
    </>
  );
}

function DraggableClockFaceTicks(): React.JSX.Element {
  return (
    <>
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index * 30 - 90) * (Math.PI / 180);
        return (
          <line
            key={index}
            x1={100 + 80 * Math.cos(angle)}
            y1={100 + 80 * Math.sin(angle)}
            x2={100 + 90 * Math.cos(angle)}
            y2={100 + 90 * Math.sin(angle)}
            stroke='#4f46e5'
            strokeWidth='3'
            strokeLinecap='round'
          />
        );
      })}
    </>
  );
}

function DraggableClockFaceNumbers(): React.JSX.Element {
  return (
    <>
      {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((number, index) => {
        const angle = (index * 30 - 90) * (Math.PI / 180);
        return (
          <text
            key={number}
            x={100 + 66 * Math.cos(angle)}
            y={100 + 66 * Math.sin(angle)}
            textAnchor='middle'
            dominantBaseline='central'
            fontSize='14'
            fontWeight='bold'
            fill='#3730a3'
          >
            {number}
          </text>
        );
      })}
    </>
  );
}

function DraggableClockHand({
  activeHand,
  color,
  dataTestId,
  enabled,
  hand,
  onPointerDown,
  x,
  y,
}: {
  activeHand: Hand | null;
  color: string;
  dataTestId: string;
  enabled: boolean;
  hand: Hand;
  onPointerDown: DraggableClockPointerDownHandler;
  x: number;
  y: number;
}): React.JSX.Element {
  const interactionStyle = resolveDraggableClockHandInteractionStyle({
    activeHand,
    enabled,
    hand,
  });
  const isActive = activeHand === hand;

  return (
    <>
      <line
        aria-hidden='true'
        data-testid={`${dataTestId}-hit-area`}
        x1='100'
        y1='100'
        x2={x}
        y2={y}
        stroke='transparent'
        strokeWidth={hand === 'hour' ? '24' : '20'}
        strokeLinecap='round'
        pointerEvents='stroke'
        style={interactionStyle}
        onPointerDown={onPointerDown}
      />
      <line
        data-testid={dataTestId}
        x1='100'
        y1='100'
        x2={x}
        y2={y}
        stroke={color}
        strokeWidth={hand === 'hour' ? (isActive ? '9' : '7') : isActive ? '7' : '5'}
        strokeLinecap='round'
        style={interactionStyle}
        onPointerDown={onPointerDown}
      />
      <circle
        cx={x}
        cy={y}
        r={isActive ? '12' : '10'}
        fill={color}
        fillOpacity='0.25'
        style={interactionStyle}
        onPointerDown={onPointerDown}
      />
    </>
  );
}

export function DraggableClockFace({
  activeHand,
  challengeRingCircumference,
  challengeRingColor,
  challengeRingOffset,
  hourHandEnabled,
  hourHandX,
  hourHandY,
  minuteHandEnabled,
  minuteHandX,
  minuteHandY,
  onHourPointerDown,
  onMinutePointerDown,
  showChallengeRing,
  showHourHand,
  showMinuteHand,
  svgRef,
}: {
  activeHand: Hand | null;
  challengeRingCircumference: number;
  challengeRingColor: string;
  challengeRingOffset: number;
  hourHandEnabled: boolean;
  hourHandX: number;
  hourHandY: number;
  minuteHandEnabled: boolean;
  minuteHandX: number;
  minuteHandY: number;
  onHourPointerDown: DraggableClockPointerDownHandler;
  onMinutePointerDown: DraggableClockPointerDownHandler;
  showChallengeRing: boolean;
  showHourHand: boolean;
  showMinuteHand: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
}): React.JSX.Element {
  return (
    <svg
      ref={svgRef}
      viewBox='0 0 200 200'
      width='220'
      height='220'
      className='drop-shadow-lg select-none'
      style={{ cursor: 'crosshair', touchAction: 'none' }}
    >
      {showChallengeRing ? (
        <DraggableClockChallengeRing
          challengeRingCircumference={challengeRingCircumference}
          challengeRingColor={challengeRingColor}
          challengeRingOffset={challengeRingOffset}
        />
      ) : null}
      <circle
        cx='100'
        cy='100'
        r='95'
        fill='var(--kangur-soft-card-background)'
        stroke='#6366f1'
        strokeWidth='4'
      />
      <DraggableClockFaceTicks />
      <DraggableClockFaceNumbers />
      {showHourHand ? (
        <DraggableClockHand
          activeHand={activeHand}
          color='#dc2626'
          dataTestId='clock-hour-hand'
          enabled={hourHandEnabled}
          hand='hour'
          onPointerDown={onHourPointerDown}
          x={hourHandX}
          y={hourHandY}
        />
      ) : null}
      {showMinuteHand ? (
        <DraggableClockHand
          activeHand={activeHand}
          color='#16a34a'
          dataTestId='clock-minute-hand'
          enabled={minuteHandEnabled}
          hand='minute'
          onPointerDown={onMinutePointerDown}
          x={minuteHandX}
          y={minuteHandY}
        />
      ) : null}
      <circle cx='100' cy='100' r='5' fill='#6366f1' />
    </svg>
  );
}

export function DraggableClockLegend({
  showHourHand,
  showMinuteHand,
  translations,
}: {
  showHourHand: boolean;
  showMinuteHand: boolean;
  translations: DraggableClockTranslations;
}): React.JSX.Element {
  return (
    <div
      className={`${KANGUR_WRAP_ROW_SPACED_CLASSNAME} justify-center text-sm [color:var(--kangur-page-muted-text)]`}
    >
      {showHourHand ? (
        <span className='flex items-center gap-1'>
          <KangurAccentDot
            accent='rose'
            aria-hidden='true'
            data-testid='clock-hour-legend-dot'
            size='md'
          />
          {translateClockTrainingWithFallback(
            translations,
            'legend.hourHand',
            'Godziny (krótka)'
          )}
        </span>
      ) : null}
      {showMinuteHand ? (
        <span className='flex items-center gap-1'>
          <KangurAccentDot
            accent='emerald'
            aria-hidden='true'
            data-testid='clock-minute-legend-dot'
            size='md'
          />
          {translateClockTrainingWithFallback(
            translations,
            'legend.minuteHand',
            'Minuty (długa)'
          )}
        </span>
      ) : null}
    </div>
  );
}

export function DraggableClockSubmitArea({
  onSubmitClick,
  submitButtonLabel,
  submitFeedback,
  submitFeedbackDetails,
  submitFeedbackTitle,
  submitLocked,
}: {
  onSubmitClick: () => void;
  submitButtonLabel: string;
  submitFeedback: Feedback;
  submitFeedbackDetails: string | null;
  submitFeedbackTitle: string | null;
  submitLocked: boolean;
}): React.JSX.Element {
  return (
    <>
      <KangurButton
        className={resolveDraggableClockSubmitButtonClassName(submitFeedback)}
        data-testid='clock-submit-button'
        disabled={submitLocked}
        onClick={onSubmitClick}
        size='xl'
        variant='primary'
      >
        {submitButtonLabel}
      </KangurButton>
      {submitFeedbackTitle ? (
        <div
          aria-live='polite'
          role='status'
          aria-atomic='true'
          className={resolveDraggableClockFeedbackClassName(submitFeedback)}
          data-testid='clock-submit-feedback'
        >
          <p className='text-sm font-extrabold'>{submitFeedbackTitle}</p>
          {submitFeedbackDetails ? (
            <p className='mt-1 text-xs font-medium leading-relaxed'>{submitFeedbackDetails}</p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

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
