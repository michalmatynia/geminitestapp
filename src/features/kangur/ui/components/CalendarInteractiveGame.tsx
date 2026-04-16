'use client';

import { Draggable, Droppable } from '@hello-pangea/dnd';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  KangurDragDropContext,
  getKangurMobileDragHandleStyle,
} from '@/features/kangur/ui/components/KangurDragDropContext';

import {
  KangurPracticeGameProgress,
  KangurPracticeGameShell,
  KangurPracticeGameSummary,
  KangurPracticeGameSummaryActions,
  KangurPracticeGameSummaryEmoji,
  KangurPracticeGameSummaryMessage,
  KangurPracticeGameSummaryProgress,
  KangurPracticeGameSummaryTitle,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';
import {
  getKangurMiniGameAccuracyText,
  getKangurMiniGameFinishLabel,
  getKangurMiniGameScoreLabel,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KangurButton,
  KangurInfoCard,
} from '@/features/kangur/ui/design/primitives';
import { cn } from '@/features/kangur/shared/utils';

import { SEASONS, WEEKDAYS } from './CalendarInteractiveGame.constants';
import { type useCalendarInteractiveGameState } from './CalendarInteractiveGame.hooks';
import { CalendarInteractiveProvider, useCalendarInteractiveContext } from './CalendarInteractive.context';
import type {
  CalendarInteractiveGameProps,
} from './CalendarInteractiveGame.types';
import {
  getCalendarInteractiveSeasonLabel,
  getCalendarInteractiveWeekdayAbbr,
  getCalendarInteractiveWeekdayShort,
  seasonDroppableId,
} from './CalendarInteractiveGame.utils';

const dragPortal = typeof document === 'undefined' ? null : document.body;

const resolveCalendarInteractiveSummaryEmoji = (percent: number): string =>
  percent === 100 ? '🏆' : percent >= 70 ? '🌟' : '💪';

function CalendarInteractiveGameSummaryView(): React.JSX.Element {
  const {
    handleRestart,
    score,
    TOTAL_ROUNDS: totalRounds,
    translations,
    onFinish,
    stage,
  } = useCalendarInteractiveContext();

  const handleFinish = onFinish ?? stage?.onFinish ?? (() => undefined);
  const percent = Math.round((score / totalRounds) * 100);

  return (
    <KangurPracticeGameSummary dataTestId='calendar-interactive-summary-shell'>
      <KangurPracticeGameSummaryEmoji
        dataTestId='calendar-interactive-summary-emoji'
        emoji={resolveCalendarInteractiveSummaryEmoji(percent)}
      />
      <KangurPracticeGameSummaryTitle
        accent='indigo'
        title={getKangurMiniGameScoreLabel(translations, score, totalRounds)}
      />
      <KangurPracticeGameSummaryMessage>
        {getKangurMiniGameAccuracyText(translations, percent)}
      </KangurPracticeGameSummaryMessage>
      <KangurPracticeGameSummaryProgress
        accent='indigo'
        ariaValueText={getKangurMiniGameAccuracyText(translations, percent)}
        dataTestId='calendar-interactive-summary-progress-bar'
        percent={percent}
      />
      <KangurPracticeGameSummaryActions
        finishLabel={getKangurMiniGameFinishLabel(translations, 'back')}
        onFinish={handleFinish}
        onRestart={handleRestart}
        restartLabel={translations('shared.restart')}
      />
    </KangurPracticeGameSummary>
  );
}

function CalendarInteractiveGuidanceCard(): React.JSX.Element | null {
  const { guidancePrompt: prompt, guidanceTitle: title, sectionContent } = useCalendarInteractiveContext();
  const { accent } = sectionContent;

  if (!title) {
    return null;
  }

  return (
    <KangurInfoCard accent={accent} tone='neutral' padding='md'>
      <div className='flex flex-col gap-1'>
        <p
          className='text-xs font-black uppercase tracking-[0.16em] text-slate-500'
          data-testid='calendar-interactive-guidance-title'
        >
          {title}
        </p>
        {prompt ? <p className='text-sm font-semibold text-slate-700'>{prompt}</p> : null}
      </div>
    </KangurInfoCard>
  );
}

function CalendarInteractivePromptCard(): React.JSX.Element {
  const {
    roundIndex,
    sectionContent,
    task,
    TOTAL_ROUNDS: totalRounds,
    translations,
  } = useCalendarInteractiveContext();
  const { accent } = sectionContent;

  return (
    <KangurInfoCard
      accent={accent}
      data-testid='calendar-interactive-prompt'
      tone='accent'
      padding='md'
    >
      <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-between'>
          <span className='text-[10px] font-black uppercase tracking-widest text-slate-400'>
            {translations('calendarInteractive.inRound.taskLabel')}
          </span>
          <span className='text-[10px] font-bold text-slate-500'>
            {roundIndex + 1} / {totalRounds}
          </span>
        </div>
        <p className='text-base font-bold text-slate-900'>{task.label}</p>
      </div>
    </KangurInfoCard>
  );
}

function CalendarInteractiveMonthToolbar(): React.JSX.Element {
  const {
    feedback,
    monthName,
    handleMonthChange: onMonthChange,
    translations,
    year,
  } = useCalendarInteractiveContext();
  const disabled = feedback !== null;

  return (
    <div className='flex items-center justify-between rounded-2xl bg-white/60 p-2 shadow-sm'>
      <KangurButton
        size='sm'
        variant='surface'
        aria-label={translations('calendarInteractive.inRound.previousMonth')}
        className='h-11 w-11 touch-manipulation kangur-cta-pill surface-cta'
        onClick={() => onMonthChange(-1)}
        disabled={disabled}
      >
        <ChevronLeft size={20} />
      </KangurButton>
      <span className='text-lg font-black text-slate-900'>
        {monthName} {year}
      </span>
      <KangurButton
        size='sm'
        variant='surface'
        aria-label={translations('calendarInteractive.inRound.nextMonth')}
        className='h-11 w-11 touch-manipulation kangur-cta-pill surface-cta'
        onClick={() => onMonthChange(1)}
        disabled={disabled}
      >
        <ChevronRight size={20} />
      </KangurButton>
    </div>
  );
}

function CalendarInteractiveWeekdayChoices(): React.JSX.Element | null {
  const {
    feedback,
    handleWeekdayClick: onWeekdayClick,
    task,
    translations,
  } = useCalendarInteractiveContext();

  if (task.type !== 'click_weekday_name') {
    return null;
  }

  const disabled = feedback !== null;

  return (
    <div className='grid grid-cols-7 gap-1 sm:gap-2'>
      {WEEKDAYS.map((day, idx) => (
        <button
          key={day.id}
          type='button'
          data-testid={`calendar-weekday-${idx}`}
          onClick={() => onWeekdayClick(idx)}
          disabled={disabled}
          className={cn(
            'soft-card flex min-h-11 flex-col items-center justify-center rounded-[16px] border p-1 text-xs font-bold uppercase transition-colors sm:p-2',
            idx >= 5 ? 'text-rose-500' : 'text-slate-500',
            disabled ? 'cursor-default' : 'cursor-pointer active:scale-[0.985] hover:bg-slate-100'
          )}
        >
          <span className='text-[10px] font-bold uppercase sm:hidden'>
            {getCalendarInteractiveWeekdayShort(translations, idx)}
          </span>
          <span className='hidden text-[10px] font-bold uppercase sm:block'>
            {getCalendarInteractiveWeekdayAbbr(translations, idx)}
          </span>
        </button>
      ))}
    </div>
  );
}

function resolveCalendarInteractiveDayCellClassName({
  day,
  dayIndex,
  feedback,
  isCorrectDate,
  isSelectedWeekend,
}: {
  day: number | null;
  dayIndex: number;
  feedback: ReturnType<typeof useCalendarInteractiveGameState>['feedback'];
  isCorrectDate: boolean;
  isSelectedWeekend: boolean;
}): string {
  const showStatus = feedback !== null && day !== null;
  return cn(
    'soft-card relative aspect-square rounded-[16px] border text-sm font-bold transition-all',
    resolveCalendarInteractiveDayCellVisibilityClassName(day, feedback),
    resolveCalendarInteractiveDayCellTextColorClassName(dayIndex),
    isSelectedWeekend && 'ring-2 ring-emerald-400 bg-emerald-50',
    resolveCalendarInteractiveDayCellStatusClassName({
      feedback,
      isCorrectDate,
      showStatus,
    })
  );
}

function resolveCalendarInteractiveDayCellVisibilityClassName(
  day: number | null,
  feedback: ReturnType<typeof useCalendarInteractiveGameState>['feedback']
): string {
  if (day === null) {
    return 'invisible';
  }

  return feedback !== null ? 'cursor-default' : 'cursor-pointer hover:shadow-md active:scale-95';
}

function resolveCalendarInteractiveDayCellTextColorClassName(dayIndex: number): string {
  return dayIndex % 7 >= 5 ? 'text-rose-500' : 'text-slate-700';
}

function resolveCalendarInteractiveDayCellStatusClassName({
  feedback,
  isCorrectDate,
  showStatus,
}: {
  feedback: ReturnType<typeof useCalendarInteractiveGameState>['feedback'];
  isCorrectDate: boolean;
  showStatus: boolean;
}): string | false {
  if (!showStatus || !isCorrectDate) {
    return false;
  }

  return feedback === 'success'
    ? 'ring-2 ring-emerald-400 bg-emerald-50'
    : 'ring-2 ring-rose-400 bg-rose-50';
}

function CalendarInteractiveDayCell({
  day,
  dayIndex,
}: {
  day: number | null;
  dayIndex: number;
}): React.JSX.Element {
  const {
    checkedAllWeekends,
    feedback,
    month,
    handleCellClick: onCellClick,
    task,
  } = useCalendarInteractiveContext();

  const isCorrectDate = task.type === 'click_date' && day === task.targetDay;
  const isSelectedWeekend =
    task.type === 'click_all_weekends' && day !== null && checkedAllWeekends.includes(day);

  return (
    <button
      key={`${month}-${dayIndex}`}
      type='button'
      data-testid={day === null ? undefined : `calendar-day-${day}`}
      onClick={() => onCellClick(day)}
      disabled={day === null || feedback !== null}
      className={resolveCalendarInteractiveDayCellClassName({
        day,
        dayIndex,
        feedback,
        isCorrectDate,
        isSelectedWeekend,
      })}
    >
      {day}
    </button>
  );
}

function CalendarInteractiveDayGrid(): React.JSX.Element {
  const {
    cells,
    month,
  } = useCalendarInteractiveContext();

  return (
    <div className='grid grid-cols-7 gap-1 sm:gap-2'>
      {cells.map((day, idx) => (
        <CalendarInteractiveDayCell
          day={day}
          dayIndex={idx}
          key={`${month}-${idx}`}
        />
      ))}
    </div>
  );
}

function resolveCalendarInteractiveSeasonCardClassName({
  accent,
  feedback,
  isCorrectSeason,
  isDraggingOver,
}: {
  accent: string;
  feedback: ReturnType<typeof useCalendarInteractiveGameState>['feedback'];
  isCorrectSeason: boolean;
  isDraggingOver: boolean;
}): string {
  return cn(
    'soft-card flex min-h-[124px] touch-manipulation flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 transition-colors',
    isDraggingOver ? `border-${accent}-400 bg-${accent}-50` : 'border-slate-200 bg-white/40',
    feedback !== null ? 'cursor-default' : 'cursor-pointer active:scale-[0.985]',
    feedback === 'success' && isCorrectSeason && 'ring-2 ring-emerald-400 bg-emerald-50'
  );
}

function CalendarInteractiveSeasonChoices(): React.JSX.Element | null {
  const {
    feedback,
    isCoarsePointer,
    monthName,
    handleSeasonSelect: onSeasonSelect,
    sectionContent,
    task,
    translations,
  } = useCalendarInteractiveContext();
  const accent = sectionContent.accent;

  if (task.type !== 'drag_season') {
    return null;
  }

  return (
    <div className='mt-2 flex flex-col gap-4'>
      {isCoarsePointer ? (
        <KangurInfoCard accent={accent} padding='sm' tone='neutral'>
          <p
            className='text-sm font-semibold text-slate-600'
            data-testid='calendar-interactive-touch-hint'
          >
            {translations('calendarInteractive.inRound.touchChooseSeason')}
          </p>
        </KangurInfoCard>
      ) : null}

      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        {SEASONS.map((season, index) => (
          <Droppable key={season.id} droppableId={seasonDroppableId(season.id)}>
            {(provided, snapshot) => (
              <button
                ref={provided.innerRef}
                type='button'
                {...provided.droppableProps}
                data-testid={`calendar-season-${index}`}
                disabled={feedback !== null}
                onClick={() => onSeasonSelect(season.id)}
                className={resolveCalendarInteractiveSeasonCardClassName({
                  accent: season.accent,
                  feedback,
                  isCorrectSeason: season.id === task.correctSeason,
                  isDraggingOver: snapshot.isDraggingOver,
                })}
              >
                <span className='text-2xl'>{season.emoji}</span>
                <span className='text-[10px] font-bold uppercase tracking-widest text-slate-500'>
                  {getCalendarInteractiveSeasonLabel(translations, season.id)}
                </span>
                {provided.placeholder}
              </button>
            )}
          </Droppable>
        ))}
      </div>

      <div className='flex justify-center'>
        <Droppable droppableId='current-month-token-home' direction='horizontal'>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              <Draggable draggableId='current-month-token' index={0} isDragDisabled={feedback !== null}>
                {(provided, snapshot) => {
                  const content = (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      data-testid='calendar-season-month-chip'
                      style={getKangurMobileDragHandleStyle(
                        provided.draggableProps.style,
                        isCoarsePointer
                      )}
                      className={cn(
                        'rounded-2xl border border-slate-100 bg-white px-6 py-3 text-base font-black text-slate-900 shadow-lg transition-transform cursor-grab active:cursor-grabbing touch-manipulation',
                        isCoarsePointer && 'min-h-[4.5rem]',
                        snapshot.isDragging && 'scale-110 active:scale-110'
                      )}
                    >
                      {monthName}
                    </div>
                  );
                  return snapshot.isDragging && dragPortal
                    ? createPortal(content, dragPortal)
                    : content;
                }}
              </Draggable>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}

function CalendarInteractiveRoundView(): React.JSX.Element {
  const {
    handleDragEnd,
    roundIndex,
    sectionContent,
    TOTAL_ROUNDS: totalRounds,
  } = useCalendarInteractiveContext();

  return (
    <KangurPracticeGameShell className='w-full max-w-2xl'>
      <KangurPracticeGameProgress
        accent={sectionContent.accent}
        currentRound={roundIndex}
        dataTestId='calendar-interactive-progress-bar'
        totalRounds={totalRounds}
      />

      <div className='flex flex-col gap-6'>
        <CalendarInteractiveGuidanceCard />
        <CalendarInteractivePromptCard />

        <KangurDragDropContext onDragEnd={handleDragEnd}>
          <div
            className='soft-card flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/70 p-4'
            data-testid='calendar-interactive-calendar-shell'
          >
            <CalendarInteractiveMonthToolbar />
            <CalendarInteractiveWeekdayChoices />
            <CalendarInteractiveDayGrid />
            <CalendarInteractiveSeasonChoices />
          </div>
        </KangurDragDropContext>
      </div>
    </KangurPracticeGameShell>
  );
}

function CalendarInteractiveGameContent(): React.JSX.Element {
  const {
    feedback,
    done,
    handleNext,
  } = useCalendarInteractiveContext();

  useEffect(() => {
    if (feedback === null || done) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      handleNext();
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [done, feedback, handleNext]);

  if (done) {
    return (
      <CalendarInteractiveGameSummaryView />
    );
  }

  return (
    <CalendarInteractiveRoundView />
  );
}

export function CalendarInteractiveGame(props: CalendarInteractiveGameProps): React.JSX.Element {
  return (
    <CalendarInteractiveProvider {...props}>
      <CalendarInteractiveGameContent />
    </CalendarInteractiveProvider>
  );
}

export default CalendarInteractiveGame;

export type { CalendarInteractiveSectionId } from './CalendarInteractiveGame.types';
