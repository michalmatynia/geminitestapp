'use client';

import { Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
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
import { useCalendarInteractiveGameState } from './CalendarInteractiveGame.hooks';
import type { CalendarInteractiveGameProps } from './CalendarInteractiveGame.types';
import {
  getCalendarCells,
  getCalendarInteractiveMonthName,
  getCalendarInteractiveSeasonLabel,
  getCalendarInteractiveWeekdayAbbr,
  getCalendarInteractiveWeekdayShort,
  getDayOfWeek,
  resolveSeasonFromDroppableId,
  seasonDroppableId,
} from './CalendarInteractiveGame.utils';

const dragPortal = typeof document === 'undefined' ? null : document.body;

export function CalendarInteractiveGame(props: CalendarInteractiveGameProps): React.JSX.Element {
  const state = useCalendarInteractiveGameState(props);
  const {
    translations,
    isCoarsePointer,
    roundIndex,
    score,
    setScore,
    month,
    setMonth,
    year,
    task,
    feedback,
    setFeedback,
    done,
    checkedAllWeekends,
    setCheckedAllWeekends,
    section,
    sectionContent,
    handleNext,
    handleRestart,
    TOTAL_ROUNDS,
  } = state;
  const handleFinish = props.onFinish ?? props.stage?.onFinish ?? (() => undefined);

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
    const percent = Math.round((score / TOTAL_ROUNDS) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='calendar-interactive-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='calendar-interactive-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 70 ? '🌟' : '💪'}
        />
        <KangurPracticeGameSummaryTitle
          accent='indigo'
          title={getKangurMiniGameScoreLabel(translations, score, TOTAL_ROUNDS)}
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

  const cells = getCalendarCells(month, year);
  const monthName = getCalendarInteractiveMonthName(translations, month);
  const showWeekdayChoices = task.type === 'click_weekday_name';
  const showSeasonChoices = task.type === 'drag_season';
  const guidanceTitle =
    section === 'mixed'
      ? null
      : translations(`calendarInteractive.section.${section}.guidanceTitle`);
  const guidancePrompt =
    section === 'mixed'
      ? null
      : translations(`calendarInteractive.section.${section}.promptLabel`);

  const handleCellClick = (day: number | null): void => {
    if (day === null || feedback !== null) return;

    if (task.type === 'click_date') {
      if (day === task.targetDay) {
        setFeedback('success');
        setScore((s) => s + 1);
      } else {
        setFeedback('error');
      }
    } else if (task.type === 'click_all_weekends') {
      if (getDayOfWeek(year, month, day) === task.dayIdx) {
        if (!checkedAllWeekends.includes(day)) {
          const nextChecked = [...checkedAllWeekends, day];
          setCheckedAllWeekends(nextChecked);
          if (nextChecked.length === task.targets.length) {
            setFeedback('success');
            setScore((s) => s + 1);
          }
        }
      } else {
        setFeedback('error');
      }
    }
  };

  const handleDragEnd = (result: DropResult): void => {
    if (feedback !== null || !result.destination) return;
    if (task.type !== 'drag_season') return;

    const droppedSeason = resolveSeasonFromDroppableId(result.destination.droppableId);
    if (droppedSeason === task.correctSeason) {
      setFeedback('success');
      setScore((s) => s + 1);
    } else {
      setFeedback('error');
    }
  };

  const handleMonthChange = (delta: number): void => {
    if (feedback !== null) return;
    const nextMonth = (month + delta + 12) % 12;
    setMonth(nextMonth);

    if (task.type === 'flip_month' && nextMonth === task.targetMonth) {
      setFeedback('success');
      setScore((s) => s + 1);
    }
  };

  const handleWeekdayClick = (idx: number): void => {
    if (feedback !== null) return;
    if (task.type === 'click_weekday_name') {
      if (idx === task.targetIdx) {
        setFeedback('success');
        setScore((s) => s + 1);
      } else {
        setFeedback('error');
      }
    }
  };

  const handleSeasonSelect = (seasonId: (typeof SEASONS)[number]['id']): void => {
    if (feedback !== null || task.type !== 'drag_season') return;

    if (seasonId === task.correctSeason) {
      setFeedback('success');
      setScore((current) => current + 1);
      return;
    }

    setFeedback('error');
  };

  return (
    <KangurPracticeGameShell className='w-full max-w-2xl'>
      <KangurPracticeGameProgress
        accent={sectionContent.accent}
        currentRound={roundIndex}
        dataTestId='calendar-interactive-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />

      <div className='flex flex-col gap-6'>
        {guidanceTitle ? (
          <KangurInfoCard accent={sectionContent.accent} tone='neutral' padding='md'>
            <div className='flex flex-col gap-1'>
              <p
                className='text-xs font-black uppercase tracking-[0.16em] text-slate-500'
                data-testid='calendar-interactive-guidance-title'
              >
                {guidanceTitle}
              </p>
              {guidancePrompt ? (
                <p className='text-sm font-semibold text-slate-700'>{guidancePrompt}</p>
              ) : null}
            </div>
          </KangurInfoCard>
        ) : null}

        <KangurInfoCard
          accent={sectionContent.accent}
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
                {roundIndex + 1} / {TOTAL_ROUNDS}
              </span>
            </div>
            <p className='text-base font-bold text-slate-900'>{task.label}</p>
          </div>
        </KangurInfoCard>

        <KangurDragDropContext onDragEnd={handleDragEnd}>
          <div
            className='soft-card flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/70 p-4'
            data-testid='calendar-interactive-calendar-shell'
          >
            <div className='flex items-center justify-between rounded-2xl bg-white/60 p-2 shadow-sm'>
              <KangurButton
                size='sm'
                variant='surface'
                aria-label={translations('calendarInteractive.inRound.previousMonth')}
                className='h-11 w-11 touch-manipulation kangur-cta-pill surface-cta'
                onClick={() => handleMonthChange(-1)}
                disabled={feedback !== null}
              >
                <ChevronLeft size={20} />
              </KangurButton>
              <span className='text-lg font-black text-slate-900'>{monthName} {year}</span>
              <KangurButton
                size='sm'
                variant='surface'
                aria-label={translations('calendarInteractive.inRound.nextMonth')}
                className='h-11 w-11 touch-manipulation kangur-cta-pill surface-cta'
                onClick={() => handleMonthChange(1)}
                disabled={feedback !== null}
              >
                <ChevronRight size={20} />
              </KangurButton>
            </div>

            {showWeekdayChoices ? (
              <div className='grid grid-cols-7 gap-1 sm:gap-2'>
                {WEEKDAYS.map((day, idx) => (
                  <button
                    key={day.id}
                    type='button'
                    data-testid={`calendar-weekday-${idx}`}
                    onClick={() => handleWeekdayClick(idx)}
                    disabled={feedback !== null}
                    className={cn(
                      'soft-card flex min-h-11 flex-col items-center justify-center rounded-[16px] border p-1 text-xs font-bold uppercase transition-colors sm:p-2',
                      idx >= 5 ? 'text-rose-500' : 'text-slate-500',
                      feedback !== null
                        ? 'cursor-default'
                        : 'cursor-pointer active:scale-[0.985] hover:bg-slate-100'
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
            ) : null}

            <div className='grid grid-cols-7 gap-1 sm:gap-2'>
              {cells.map((day, idx) => {
                const isCorrect = task.type === 'click_date' && day === task.targetDay;
                const isSelectedWeekend = task.type === 'click_all_weekends' && day !== null && checkedAllWeekends.includes(day);
                const showStatus = feedback !== null && day !== null;
                const dayIdx = idx % 7;

                return (
                  <button
                    key={`${month}-${idx}`}
                    type='button'
                    data-testid={day === null ? undefined : `calendar-day-${day}`}
                    onClick={() => handleCellClick(day)}
                    disabled={day === null || feedback !== null}
                    className={cn(
                      'soft-card relative aspect-square rounded-[16px] border text-sm font-bold transition-all',
                      day === null
                        ? 'invisible'
                        : feedback !== null
                          ? 'cursor-default'
                          : 'cursor-pointer hover:shadow-md active:scale-95',
                      dayIdx >= 5 ? 'text-rose-500' : 'text-slate-700',
                      isSelectedWeekend && 'ring-2 ring-emerald-400 bg-emerald-50',
                      showStatus && isCorrect && feedback === 'success' && 'ring-2 ring-emerald-400 bg-emerald-50',
                      showStatus && isCorrect && feedback === 'error' && 'ring-2 ring-rose-400 bg-rose-50'
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {showSeasonChoices && (
              <div className='flex flex-col gap-4 mt-2'>
                {isCoarsePointer ? (
                  <KangurInfoCard accent={sectionContent.accent} padding='sm' tone='neutral'>
                    <p
                      className='text-sm font-semibold text-slate-600'
                      data-testid='calendar-interactive-touch-hint'
                    >
                      {translations('calendarInteractive.inRound.touchChooseSeason')}
                    </p>
                  </KangurInfoCard>
                ) : null}

                <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
                  {SEASONS.map((season, index) => (
                    <Droppable key={season.id} droppableId={seasonDroppableId(season.id)}>
                      {(provided, snapshot) => (
                        <button
                          ref={provided.innerRef}
                          type='button'
                          {...provided.droppableProps}
                          data-testid={`calendar-season-${index}`}
                          disabled={feedback !== null}
                          onClick={() => handleSeasonSelect(season.id)}
                          className={cn(
                            'soft-card flex min-h-[124px] touch-manipulation flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 transition-colors',
                            snapshot.isDraggingOver ? `border-${season.accent}-400 bg-${season.accent}-50` : 'border-slate-200 bg-white/40',
                            feedback !== null ? 'cursor-default' : 'cursor-pointer active:scale-[0.985]',
                            feedback === 'success' && season.id === task.correctSeason && 'ring-2 ring-emerald-400 bg-emerald-50'
                          )}
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
                                style={getKangurMobileDragHandleStyle(provided.draggableProps.style, isCoarsePointer)}
                                className={cn(
                                  'rounded-2xl border border-slate-100 bg-white px-6 py-3 text-base font-black text-slate-900 shadow-lg transition-transform cursor-grab active:cursor-grabbing touch-manipulation',
                                  isCoarsePointer && 'min-h-[4.5rem]',
                                  snapshot.isDragging && 'scale-110 active:scale-110'
                                )}
                              >
                                {monthName}
                              </div>
                            );
                            return snapshot.isDragging && dragPortal ? createPortal(content, dragPortal) : content;
                          }}
                        </Draggable>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            )}
          </div>
        </KangurDragDropContext>
      </div>
    </KangurPracticeGameShell>
  );
}

export default CalendarInteractiveGame;

export type { CalendarInteractiveSectionId } from './CalendarInteractiveGame.types';
