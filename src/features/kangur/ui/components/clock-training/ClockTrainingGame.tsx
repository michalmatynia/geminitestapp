'use client';

import { Printer } from 'lucide-react';
import React from 'react';
import { useTranslations } from 'next-intl';

import { useOptionalKangurLessonPrint } from '@/features/kangur/ui/context/KangurLessonPrintContext';
import { KangurButton, KangurInlineFallback } from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { translateClockTrainingWithFallback } from './clock-training-i18n';
import { ClockTrainingGameView } from './ClockTrainingGame.views';
import { ClockTrainingProvider, useClockTrainingContext } from './ClockTraining.context';

import type {
  ClockTrainingProps as ClockTrainingGameProps,
} from '../clock-training/types';
import {
  buildClockTaskPrompt,
  getClockTrainingSummaryMessage,
} from './clock-training-utils';

function ClockTrainingGameContent(): React.JSX.Element {
  const lessonNavigationTranslations = useTranslations('KangurLessonsWidgets.navigation');
  const gamePageTranslations = useTranslations('KangurGamePage');
  const { props, state } = useClockTrainingContext();
  const {
    current,
    done,
    score,
    tasks,
    trainingSectionContent,
    translations,
  } = state;
  const {
    section,
  } = props;
  const isCoarsePointer = useKangurCoarsePointer();
  const lessonPrint = useOptionalKangurLessonPrint();
  const printPanelId = `clock-training-${section}`;
  const printPanelLabel = lessonNavigationTranslations('printPanel');

  const task = tasks[current];
  if (!task) {
    return (
      <KangurInlineFallback
        data-testid='clock-training-empty'
        title={translateClockTrainingWithFallback(translations, 'emptyState', 'Brak zadania.')}
      />
    );
  }

  const printPanelTitle = trainingSectionContent.promptLabel;
  const printTaskPrompt = buildClockTaskPrompt(task, section ?? 'mixed', translations);
  const printHint = gamePageTranslations('practiceQuestion.printHint');
  const printTargetTime = `${task.hours}:${String(task.minutes).padStart(2, '0')}`;
  const printScoreLabel = `${score}/${tasks.length}`;
  const printSummaryMessage = getClockTrainingSummaryMessage(
    section ?? 'mixed',
    score,
    tasks.length,
    translations
  );

  return (
    <div
      data-kangur-print-panel='true'
      data-kangur-print-paged-panel='true'
      data-kangur-print-preferred-target='true'
      data-kangur-print-panel-id={printPanelId}
      data-kangur-print-panel-title={printPanelTitle}
      data-testid='clock-training-print-panel'
    >
      <div
        className='kangur-print-only space-y-3 border-b border-slate-200 pb-4'
        data-testid='clock-training-print-summary'
      >
        <div className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
          {printPanelTitle}
        </div>
        {done ? (
          <>
            <p className='text-base font-semibold leading-relaxed text-slate-900'>
              {printSummaryMessage}
            </p>
            <p className='text-sm text-slate-700'>{printScoreLabel}</p>
          </>
        ) : (
          <>
            <p className='text-base font-semibold leading-relaxed text-slate-900'>
              {printTaskPrompt}
            </p>
            <p className='text-sm text-slate-700'>{printTargetTime}</p>
          </>
        )}
        <p className='text-sm text-slate-600'>{printHint}</p>
      </div>

      <div data-kangur-print-exclude='true' data-testid='clock-training-live-ui'>
        {lessonPrint?.onPrintPanel ? (
          <div className='mb-4 flex justify-end'>
            <KangurButton
              onClick={() => lessonPrint.onPrintPanel?.(printPanelId)}
              className={isCoarsePointer ? 'min-h-11 touch-manipulation select-none active:scale-[0.97]' : undefined}
              data-testid='clock-training-print-button'
              size='sm'
              type='button'
              variant='surface'
              aria-label={printPanelLabel}
              title={printPanelLabel}
            >
              <Printer className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
              <span className='sr-only'>{printPanelLabel}</span>
            </KangurButton>
          </div>
        ) : null}

        <ClockTrainingGameView />
      </div>
    </div>
  );
}

export default function ClockTrainingGame(props: ClockTrainingGameProps): React.JSX.Element {
  return (
    <ClockTrainingProvider {...props}>
      <ClockTrainingGameContent />
    </ClockTrainingProvider>
  );
}

export {
  angleToMinute,
  applyHourAngleToCycleMinutes,
  applyMinuteStepToCycleMinutes,
  applyMinuteValueToCycleMinutes,
  buildClockCorrectFeedback,
  buildClockTaskPrompt,
  buildClockTimeoutFeedback,
  buildClockWrongFeedback,
  cycleMinutesToDisplayHour,
  cycleMinutesToDisplayMinutes,
  cycleMinutesToHourAngle,
  getClockDistanceInMinutes,
  getClockTrainingSummaryMessage,
  scheduleRetryTask,
  taskToKey,
} from './clock-training-utils';
