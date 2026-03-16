import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import {
  KangurAccentDot,
  KangurButton,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';
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

export type DraggableClockProps = {
  onSubmit: (hours: number, minutes: number) => void;
  showChallengeRing?: boolean;
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

export function DraggableClock({
  onSubmit,
  showChallengeRing = false,
  challengeTimeLeft = CHALLENGE_TIME_LIMIT_SECONDS,
  challengeTimeLimit = CHALLENGE_TIME_LIMIT_SECONDS,
  section = 'mixed',
  showTimeDisplay = true,
  submitFeedback = null,
  submitFeedbackDetails = null,
  submitFeedbackTitle = null,
  submitNextStep = null,
  submitLocked = false,
}: DraggableClockProps): React.JSX.Element {
  const [cycleMinutes, setCycleMinutes] = useState(0);
  const [minuteSnapMode, setMinuteSnapMode] = useState<MinuteSnapMode>('5min');
  const [activeHand, setActiveHand] = useState<Hand | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef<Hand | null>(null);
  const minuteStep = MINUTE_STEP_BY_MODE[minuteSnapMode];
  const hourHandEnabled = section !== 'minutes';
  const minuteHandEnabled = section !== 'hours';

  const getAngle = useCallback((event: MouseEvent | TouchEvent): number => {
    const svg = svgRef.current;
    if (!svg) {
      return 0;
    }

    const rect = svg.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in event) {
      const touch = event.touches[0];
      if (!touch) {
        return 0;
      }
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    return angle;
  }, []);

  const onMouseDown =
    (hand: Hand) =>
      (event: ReactMouseEvent<SVGElement> | ReactTouchEvent<SVGElement>): void => {
        if (submitLocked) {
          return;
        }
        const handEnabled =
          (hand === 'hour' && hourHandEnabled) || (hand === 'minute' && minuteHandEnabled);
        if (!handEnabled) {
          return;
        }
        event.preventDefault();
        dragging.current = hand;
        setActiveHand(hand);
      };

  const onMove = useCallback(
    (event: MouseEvent | TouchEvent): void => {
      if (!dragging.current) {
        return;
      }
      if (event.cancelable) {
        event.preventDefault();
      }

      const angle = getAngle(event);

      if (dragging.current === 'minute') {
        setCycleMinutes((previous) => applyMinuteAngleToCycleMinutes(previous, angle, minuteStep));
      } else {
        setCycleMinutes((previous) => applyHourAngleToCycleMinutes(previous, angle));
      }
    },
    [getAngle, minuteStep]
  );

  const onUp = useCallback((): void => {
    dragging.current = null;
    setActiveHand(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [onMove, onUp]);

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
  const challengeRingColor =
    challengeProgress <= 0.2 ? '#dc2626' : challengeProgress <= 0.5 ? '#f97316' : '#f59e0b';
  const hourHandInteractionStyle = {
    cursor: hourHandEnabled ? (activeHand === 'hour' ? 'grabbing' : 'grab') : 'not-allowed',
    opacity: hourHandEnabled ? 1 : 0.45,
    touchAction: 'none',
  };
  const minuteHandInteractionStyle = {
    cursor: minuteHandEnabled ? (activeHand === 'minute' ? 'grabbing' : 'grab') : 'not-allowed',
    opacity: minuteHandEnabled ? 1 : 0.45,
    touchAction: 'none',
  };
  const submitButtonLabel =
    submitFeedback === 'correct'
      ? 'Dobrze! ✅'
      : submitFeedback === 'wrong'
        ? 'Błąd! ❌'
        : 'Sprawdź! ✅';

  return (
    <div className='flex flex-col items-center gap-4'>
      {showTimeDisplay ? (
        <KangurStatusChip
          accent='indigo'
          className='px-5 py-2 text-2xl font-extrabold'
          data-testid='clock-time-display'
        >
          {displayHour}:{pad(displayMinutes)}
        </KangurStatusChip>
      ) : null}
      {minuteHandEnabled ? (
        <div
          className={cn(
            KANGUR_SEGMENTED_CONTROL_CLASSNAME,
            'inline-flex w-auto flex-wrap items-center justify-center'
          )}
          data-testid='clock-snap-mode-switch'
        >
          <KangurButton
            type='button'
            data-testid='clock-snap-mode-5'
            onClick={() => setMinuteSnapMode('5min')}
            className='h-10 px-3.5 text-xs sm:flex-none'
            size='sm'
            variant={minuteSnapMode === '5min' ? 'segmentActive' : 'segment'}
          >
            Skok co 5 min
          </KangurButton>
          <KangurButton
            type='button'
            data-testid='clock-snap-mode-1'
            onClick={() => setMinuteSnapMode('1min')}
            className='h-10 px-3.5 text-xs sm:flex-none'
            size='sm'
            variant={minuteSnapMode === '1min' ? 'segmentActive' : 'segment'}
          >
            Dokładnie co 1 min
          </KangurButton>
        </div>
      ) : null}
      {(() => {
        const interactionHint =
          submitFeedback === 'correct'
            ? submitNextStep === 'summary'
              ? 'Dobra odpowiedź. Za chwilę podsumowanie.'
              : submitNextStep === 'next-stage'
                ? 'Dobra odpowiedź. Za chwilę kolejny etap.'
                : 'Dobra odpowiedź. Za chwilę następne zadanie.'
            : submitFeedback === 'wrong'
              ? submitNextStep === 'summary'
                ? 'Sprawdziliśmy odpowiedź. Za chwilę podsumowanie.'
                : submitNextStep === 'next-stage'
                  ? 'Sprawdziliśmy odpowiedź. Za chwilę kolejny etap.'
                  : 'Sprawdziliśmy odpowiedź. Za chwilę następne zadanie.'
              : section === 'minutes'
                ? null
                : section === 'hours'
                  ? null
                  : 'Wskazówka godzin przesuwa się płynnie razem z minutami.';

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
      })()}

      <svg
        ref={svgRef}
        viewBox='0 0 200 200'
        width='220'
        height='220'
        className='drop-shadow-lg select-none'
        style={{ cursor: 'crosshair' }}
      >
        {showChallengeRing && (
          <>
            <circle
              data-testid='clock-challenge-ring-track'
              cx='100'
              cy='100'
              r={challengeRingRadius}
              fill='none'
              stroke='#fde68a'
              strokeWidth='6'
              strokeLinecap='round'
            />
            <circle
              data-testid='clock-challenge-ring'
              cx='100'
              cy='100'
              r={challengeRingRadius}
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
        )}
        <circle
          cx='100'
          cy='100'
          r='95'
          fill='var(--kangur-soft-card-background)'
          stroke='#6366f1'
          strokeWidth='4'
        />

        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          return (
            <line
              key={i}
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

        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          return (
            <text
              key={n}
              x={100 + 66 * Math.cos(angle)}
              y={100 + 66 * Math.sin(angle)}
              textAnchor='middle'
              dominantBaseline='central'
              fontSize='14'
              fontWeight='bold'
              fill='#3730a3'
            >
              {n}
            </text>
          );
        })}

        <line
          aria-hidden='true'
          data-testid='clock-hour-hand-hit-area'
          x1='100'
          y1='100'
          x2={hourHandX}
          y2={hourHandY}
          stroke='transparent'
          strokeWidth='24'
          strokeLinecap='round'
          pointerEvents='stroke'
          style={hourHandInteractionStyle}
          onMouseDown={onMouseDown('hour')}
          onTouchStart={onMouseDown('hour')}
        />
        <line
          data-testid='clock-hour-hand'
          x1='100'
          y1='100'
          x2={hourHandX}
          y2={hourHandY}
          stroke='#dc2626'
          strokeWidth={activeHand === 'hour' ? '9' : '7'}
          strokeLinecap='round'
          style={hourHandInteractionStyle}
          onMouseDown={onMouseDown('hour')}
          onTouchStart={onMouseDown('hour')}
        />

        <line
          aria-hidden='true'
          data-testid='clock-minute-hand-hit-area'
          x1='100'
          y1='100'
          x2={minuteHandX}
          y2={minuteHandY}
          stroke='transparent'
          strokeWidth='20'
          strokeLinecap='round'
          pointerEvents='stroke'
          style={minuteHandInteractionStyle}
          onMouseDown={onMouseDown('minute')}
          onTouchStart={onMouseDown('minute')}
        />
        <line
          data-testid='clock-minute-hand'
          x1='100'
          y1='100'
          x2={minuteHandX}
          y2={minuteHandY}
          stroke='#16a34a'
          strokeWidth={activeHand === 'minute' ? '7' : '5'}
          strokeLinecap='round'
          style={minuteHandInteractionStyle}
          onMouseDown={onMouseDown('minute')}
          onTouchStart={onMouseDown('minute')}
        />

        <circle
          cx={hourHandX}
          cy={hourHandY}
          r={activeHand === 'hour' ? '12' : '10'}
          fill='#dc2626'
          fillOpacity='0.25'
          style={hourHandInteractionStyle}
          onMouseDown={onMouseDown('hour')}
          onTouchStart={onMouseDown('hour')}
        />
        <circle
          cx={minuteHandX}
          cy={minuteHandY}
          r={activeHand === 'minute' ? '12' : '10'}
          fill='#16a34a'
          fillOpacity='0.25'
          style={minuteHandInteractionStyle}
          onMouseDown={onMouseDown('minute')}
          onTouchStart={onMouseDown('minute')}
        />
        <circle cx='100' cy='100' r='5' fill='#6366f1' />
      </svg>

      <div className='flex flex-wrap justify-center gap-x-3 gap-y-2 text-sm [color:var(--kangur-page-muted-text)]'>
        <span className='flex items-center gap-1'>
          <KangurAccentDot
            accent='rose'
            aria-hidden='true'
            data-testid='clock-hour-legend-dot'
            size='md'
          />
          Godziny (krótka)
        </span>
        <span className='flex items-center gap-1'>
          <KangurAccentDot
            accent='emerald'
            aria-hidden='true'
            data-testid='clock-minute-legend-dot'
            size='md'
          />
          Minuty (długa)
        </span>
      </div>

      {(() => {
        const submitButtonTone = submitFeedback ?? 'idle';
        const isSubmitDisabled = submitLocked;
        const handleSubmitClick = (): void => {
          onSubmit(displayHour, displayMinutes);
        };

        return (
          <KangurButton
            className={cn(
              'w-full disabled:opacity-100 sm:w-auto',
              submitButtonTone === 'correct' &&
                'border-emerald-500 bg-emerald-500 text-white hover:border-emerald-500 hover:bg-emerald-500',
              submitButtonTone === 'wrong' &&
                'border-rose-500 bg-rose-500 text-white hover:border-rose-500 hover:bg-rose-500'
            )}
            data-testid='clock-submit-button'
            disabled={isSubmitDisabled}
            onClick={handleSubmitClick}
            size='xl'
            variant='primary'
          >
            {submitButtonLabel}
          </KangurButton>
        );
      })()}
      {submitFeedbackTitle ? (
        <div
          aria-live='polite'
          role='status'
          aria-atomic='true'
          className={cn(
            'max-w-md rounded-3xl border px-4 py-3 text-center shadow-sm',
            submitFeedback === 'correct'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          )}
          data-testid='clock-submit-feedback'
        >
          <p className='text-sm font-extrabold'>{submitFeedbackTitle}</p>
          {submitFeedbackDetails ? (
            <p className='mt-1 text-xs font-medium leading-relaxed'>{submitFeedbackDetails}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
