'use client';

import * as React from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useTranslations } from 'next-intl';

import {
  KangurAccentDot,
  KangurButton,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
  KANGUR_WRAP_ROW_SPACED_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';
import { KANGUR_CLOCK_THEME_COLORS } from '@/features/kangur/ui/components/clock-theme';

import type { ClockTrainingTaskPoolId } from './types';
import type { Feedback, Hand, MinuteSnapMode } from './clock-training-utils';
import { translateClockTrainingWithFallback } from './clock-training-i18n';

export type DraggableClockSubmitNextStep = 'next-stage' | 'next-task' | 'summary' | null;
type DraggableClockTranslations = ReturnType<typeof useTranslations>;
type DraggableClockPointerDownHandler = (event: ReactPointerEvent<SVGElement>) => void;

export type DraggableClockContextValue = {
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
  translations: DraggableClockTranslations;
};

export const DraggableClockContext =
  React.createContext<DraggableClockContextValue | null>(null);

function useDraggableClock(): DraggableClockContextValue {
  const context = React.useContext(DraggableClockContext);
  if (!context) {
    throw new Error('useDraggableClock must be used within DraggableClockContext.Provider.');
  }
  return context;
}

export const resolveDraggableClockChallengeRingColor = (
  challengeProgress: number
): string => {
  if (challengeProgress <= 0.2) {
    return KANGUR_CLOCK_THEME_COLORS.challengeLow;
  }

  if (challengeProgress <= 0.5) {
    return KANGUR_CLOCK_THEME_COLORS.challengeMid;
  }

  return KANGUR_CLOCK_THEME_COLORS.challengeHigh;
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

const resolveDraggableClockSubmitButtonClassName = (): string => 'w-full disabled:opacity-100 sm:w-auto';

const resolveDraggableClockSubmitButtonStyle = (
  submitFeedback: Feedback
): React.CSSProperties | undefined => {
  if (submitFeedback === 'correct') {
    return {
      backgroundColor: KANGUR_CLOCK_THEME_COLORS.feedbackCorrectBackground,
      borderColor: KANGUR_CLOCK_THEME_COLORS.feedbackCorrectBorder,
      color: KANGUR_CLOCK_THEME_COLORS.contrastText,
    };
  }

  if (submitFeedback === 'wrong') {
    return {
      backgroundColor: KANGUR_CLOCK_THEME_COLORS.feedbackWrongBackground,
      borderColor: KANGUR_CLOCK_THEME_COLORS.feedbackWrongBorder,
      color: KANGUR_CLOCK_THEME_COLORS.contrastText,
    };
  }

  return undefined;
};

const resolveDraggableClockFeedbackClassName = (): string =>
  'max-w-md rounded-3xl border px-4 py-3 text-center shadow-sm';

const resolveDraggableClockFeedbackStyle = (
  submitFeedback: Feedback
): React.CSSProperties => ({
  backgroundColor:
    submitFeedback === 'correct'
      ? KANGUR_CLOCK_THEME_COLORS.feedbackCorrectSoftBackground
      : KANGUR_CLOCK_THEME_COLORS.feedbackWrongSoftBackground,
  borderColor:
    submitFeedback === 'correct'
      ? KANGUR_CLOCK_THEME_COLORS.feedbackCorrectBorder
      : KANGUR_CLOCK_THEME_COLORS.feedbackWrongBorder,
  color:
    submitFeedback === 'correct'
      ? KANGUR_CLOCK_THEME_COLORS.feedbackCorrectText
      : KANGUR_CLOCK_THEME_COLORS.feedbackWrongText,
});

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
      {displayHour}:{displayMinutes.toString().padStart(2, '0')}
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

function DraggableClockChallengeRing(): React.JSX.Element {
  const {
    challengeRingCircumference,
    challengeRingColor,
    challengeRingOffset,
  } = useDraggableClock();

  return (
    <>
      <circle
        data-testid='clock-challenge-ring-track'
        cx='100'
        cy='100'
        r='98'
        fill='none'
        stroke={KANGUR_CLOCK_THEME_COLORS.challengeTrack}
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
            stroke={KANGUR_CLOCK_THEME_COLORS.majorTick}
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
            fill={KANGUR_CLOCK_THEME_COLORS.numeral}
          >
            {number}
          </text>
        );
      })}
    </>
  );
}

function DraggableClockHand({
  color,
  dataTestId,
  hand,
  x,
  y,
}: {
  color: string;
  dataTestId: string;
  hand: Hand;
  x: number;
  y: number;
}): React.JSX.Element {
  const {
    activeHand,
    hourHandEnabled,
    minuteHandEnabled,
    onHourPointerDown,
    onMinutePointerDown,
  } = useDraggableClock();

  const enabled = hand === 'hour' ? hourHandEnabled : minuteHandEnabled;
  const onPointerDown = hand === 'hour' ? onHourPointerDown : onMinutePointerDown;

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
  hourHandX,
  hourHandY,
  minuteHandX,
  minuteHandY,
  showChallengeRing,
  showHourHand,
  showMinuteHand,
  svgRef,
}: {
  hourHandX: number;
  hourHandY: number;
  minuteHandX: number;
  minuteHandY: number;
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
        <DraggableClockChallengeRing />
      ) : null}

      <circle
        cx='100'
        cy='100'
        r='95'
        fill={KANGUR_CLOCK_THEME_COLORS.faceFill}
        stroke={KANGUR_CLOCK_THEME_COLORS.faceStroke}
        strokeWidth='4'
      />
      <DraggableClockFaceTicks />
      <DraggableClockFaceNumbers />
      {showHourHand ? (
        <DraggableClockHand
          color={KANGUR_CLOCK_THEME_COLORS.interactiveHourHand}
          dataTestId='clock-hour-hand'
          hand='hour'
          x={hourHandX}
          y={hourHandY}
        />
      ) : null}
      {showMinuteHand ? (
        <DraggableClockHand
          color={KANGUR_CLOCK_THEME_COLORS.interactiveMinuteHand}
          dataTestId='clock-minute-hand'
          hand='minute'
          x={minuteHandX}
          y={minuteHandY}
        />
      ) : null}
      <circle cx='100' cy='100' r='5' fill={KANGUR_CLOCK_THEME_COLORS.center} />
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
            style={{ backgroundColor: KANGUR_CLOCK_THEME_COLORS.interactiveHourHand }}
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
            style={{ backgroundColor: KANGUR_CLOCK_THEME_COLORS.interactiveMinuteHand }}
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
        className={resolveDraggableClockSubmitButtonClassName()}
        data-testid='clock-submit-button'
        disabled={submitLocked}
        onClick={onSubmitClick}
        size='xl'
        style={resolveDraggableClockSubmitButtonStyle(submitFeedback)}
        variant='primary'
      >
        {submitButtonLabel}
      </KangurButton>
      {submitFeedbackTitle ? (
        <div
          aria-live='polite'
          role='status'
          aria-atomic='true'
          className={resolveDraggableClockFeedbackClassName()}
          data-testid='clock-submit-feedback'
          style={resolveDraggableClockFeedbackStyle(submitFeedback)}
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
