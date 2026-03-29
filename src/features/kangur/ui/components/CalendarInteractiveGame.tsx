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
import type {
  CalendarInteractiveGameProps,
  CalendarInteractiveSectionContent,
  Season,
  Task,
} from './CalendarInteractiveGame.types';
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

const markCalendarInteractiveSuccess = ({
  setFeedback,
  setScore,
}: {
  setFeedback: (value: 'success' | 'error') => void;
  setScore: React.Dispatch<React.SetStateAction<number>>;
}): void => {
  setFeedback('success');
  setScore((current) => current + 1);
};

const markCalendarInteractiveError = (
  setFeedback: (value: 'success' | 'error') => void
): void => {
  setFeedback('error');
};

const resolveCalendarInteractiveGuidance = ({
  section,
  translations,
}: {
  section: ReturnType<typeof useCalendarInteractiveGameState>['section'];
  translations: ReturnType<typeof useCalendarInteractiveGameState>['translations'];
}): { prompt: string | null; title: string | null } =>
  section === 'mixed'
    ? { prompt: null, title: null }
    : {
        prompt: translations(`calendarInteractive.section.${section}.promptLabel`),
        title: translations(`calendarInteractive.section.${section}.guidanceTitle`),
      };

const resolveCalendarInteractiveSummaryEmoji = (percent: number): string =>
  percent === 100 ? '🏆' : percent >= 70 ? '🌟' : '💪';

const handleCalendarInteractiveDateSelection = ({
  day,
  targetDay,
  setFeedback,
  setScore,
}: {
  day: number;
  setFeedback: (value: 'success' | 'error') => void;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  targetDay: number;
}): void => {
  if (day === targetDay) {
    markCalendarInteractiveSuccess({ setFeedback, setScore });
    return;
  }

  markCalendarInteractiveError(setFeedback);
};

const handleCalendarInteractiveWeekendSelection = ({
  checkedAllWeekends,
  day,
  month,
  setCheckedAllWeekends,
  setFeedback,
  setScore,
  targetCount,
  weekendDayIndex,
  year,
}: {
  checkedAllWeekends: number[];
  day: number;
  month: number;
  setCheckedAllWeekends: React.Dispatch<React.SetStateAction<number[]>>;
  setFeedback: (value: 'success' | 'error') => void;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  targetCount: number;
  weekendDayIndex: 5 | 6;
  year: number;
}): void => {
  if (getDayOfWeek(year, month, day) !== weekendDayIndex) {
    markCalendarInteractiveError(setFeedback);
    return;
  }
  if (checkedAllWeekends.includes(day)) {
    return;
  }

  const nextChecked = [...checkedAllWeekends, day];
  setCheckedAllWeekends(nextChecked);
  if (nextChecked.length === targetCount) {
    markCalendarInteractiveSuccess({ setFeedback, setScore });
  }
};

const handleCalendarInteractiveSeasonDrop = ({
  correctSeason,
  droppableId,
  setFeedback,
  setScore,
}: {
  correctSeason: Season;
  droppableId: string;
  setFeedback: (value: 'success' | 'error') => void;
  setScore: React.Dispatch<React.SetStateAction<number>>;
}): void => {
  const droppedSeason = resolveSeasonFromDroppableId(droppableId);
  if (droppedSeason === correctSeason) {
    markCalendarInteractiveSuccess({ setFeedback, setScore });
    return;
  }

  markCalendarInteractiveError(setFeedback);
};

const handleCalendarInteractiveMonthFlip = ({
  month,
  delta,
  setMonth,
  setFeedback,
  setScore,
  targetMonth,
}: {
  delta: number;
  month: number;
  setFeedback: (value: 'success' | 'error') => void;
  setMonth: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  targetMonth: number;
}): void => {
  const nextMonth = (month + delta + 12) % 12;
  setMonth(nextMonth);

  if (nextMonth === targetMonth) {
    markCalendarInteractiveSuccess({ setFeedback, setScore });
  }
};

const handleCalendarInteractiveWeekdaySelection = ({
  idx,
  setFeedback,
  setScore,
  targetIdx,
}: {
  idx: number;
  setFeedback: (value: 'success' | 'error') => void;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  targetIdx: number;
}): void => {
  if (idx === targetIdx) {
    markCalendarInteractiveSuccess({ setFeedback, setScore });
    return;
  }

  markCalendarInteractiveError(setFeedback);
};

const handleCalendarInteractiveSeasonSelection = ({
  correctSeason,
  seasonId,
  setFeedback,
  setScore,
}: {
  correctSeason: Season;
  seasonId: Season;
  setFeedback: (value: 'success' | 'error') => void;
  setScore: React.Dispatch<React.SetStateAction<number>>;
}): void => {
  if (seasonId === correctSeason) {
    markCalendarInteractiveSuccess({ setFeedback, setScore });
    return;
  }

  markCalendarInteractiveError(setFeedback);
};

function CalendarInteractiveGameSummaryView({
  handleFinish,
  handleRestart,
  score,
  totalRounds,
  translations,
}: {
  handleFinish: () => void;
  handleRestart: () => void;
  score: number;
  totalRounds: number;
  translations: ReturnType<typeof useCalendarInteractiveGameState>['translations'];
}): React.JSX.Element {
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

function CalendarInteractiveGuidanceCard({
  accent,
  prompt,
  title,
}: {
  accent: CalendarInteractiveSectionContent['accent'];
  prompt: string | null;
  title: string | null;
}): React.JSX.Element | null {
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

function CalendarInteractivePromptCard({
  accent,
  roundIndex,
  taskLabel,
  totalRounds,
  translations,
}: {
  accent: CalendarInteractiveSectionContent['accent'];
  roundIndex: number;
  taskLabel: string;
  totalRounds: number;
  translations: ReturnType<typeof useCalendarInteractiveGameState>['translations'];
}): React.JSX.Element {
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
        <p className='text-base font-bold text-slate-900'>{taskLabel}</p>
      </div>
    </KangurInfoCard>
  );
}

function CalendarInteractiveMonthToolbar({
  disabled,
  monthName,
  onMonthChange,
  translations,
  year,
}: {
  disabled: boolean;
  monthName: string;
  onMonthChange: (delta: number) => void;
  translations: ReturnType<typeof useCalendarInteractiveGameState>['translations'];
  year: number;
}): React.JSX.Element {
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

function CalendarInteractiveWeekdayChoices({
  disabled,
  onWeekdayClick,
  translations,
}: {
  disabled: boolean;
  onWeekdayClick: (idx: number) => void;
  translations: ReturnType<typeof useCalendarInteractiveGameState>['translations'];
}): React.JSX.Element {
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
  checkedAllWeekends,
  day,
  dayIndex,
  feedback,
  month,
  onCellClick,
  task,
}: {
  checkedAllWeekends: number[];
  day: number | null;
  dayIndex: number;
  feedback: ReturnType<typeof useCalendarInteractiveGameState>['feedback'];
  month: number;
  onCellClick: (day: number | null) => void;
  task: Task;
}): React.JSX.Element {
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

function CalendarInteractiveDayGrid({
  cells,
  checkedAllWeekends,
  feedback,
  month,
  onCellClick,
  task,
}: {
  cells: Array<number | null>;
  checkedAllWeekends: number[];
  feedback: ReturnType<typeof useCalendarInteractiveGameState>['feedback'];
  month: number;
  onCellClick: (day: number | null) => void;
  task: Task;
}): React.JSX.Element {
  return (
    <div className='grid grid-cols-7 gap-1 sm:gap-2'>
      {cells.map((day, idx) => (
        <CalendarInteractiveDayCell
          checkedAllWeekends={checkedAllWeekends}
          day={day}
          dayIndex={idx}
          feedback={feedback}
          key={`${month}-${idx}`}
          month={month}
          onCellClick={onCellClick}
          task={task}
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

function CalendarInteractiveSeasonChoices({
  accent,
  feedback,
  isCoarsePointer,
  monthName,
  onSeasonSelect,
  task,
  translations,
}: {
  accent: CalendarInteractiveSectionContent['accent'];
  feedback: ReturnType<typeof useCalendarInteractiveGameState>['feedback'];
  isCoarsePointer: boolean;
  monthName: string;
  onSeasonSelect: (seasonId: Season) => void;
  task: Task;
  translations: ReturnType<typeof useCalendarInteractiveGameState>['translations'];
}): React.JSX.Element | null {
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

function CalendarInteractiveRoundView({
  cells,
  checkedAllWeekends,
  feedback,
  guidancePrompt,
  guidanceTitle,
  handleCellClick,
  handleDragEnd,
  handleMonthChange,
  handleSeasonSelect,
  handleWeekdayClick,
  isCoarsePointer,
  month,
  monthName,
  roundIndex,
  sectionContent,
  task,
  totalRounds,
  translations,
  year,
}: {
  cells: Array<number | null>;
  checkedAllWeekends: number[];
  feedback: ReturnType<typeof useCalendarInteractiveGameState>['feedback'];
  guidancePrompt: string | null;
  guidanceTitle: string | null;
  handleCellClick: (day: number | null) => void;
  handleDragEnd: (result: DropResult) => void;
  handleMonthChange: (delta: number) => void;
  handleSeasonSelect: (seasonId: Season) => void;
  handleWeekdayClick: (idx: number) => void;
  isCoarsePointer: boolean;
  month: number;
  monthName: string;
  roundIndex: number;
  sectionContent: ReturnType<typeof useCalendarInteractiveGameState>['sectionContent'];
  task: Task;
  totalRounds: number;
  translations: ReturnType<typeof useCalendarInteractiveGameState>['translations'];
  year: number;
}): React.JSX.Element {
  return (
    <KangurPracticeGameShell className='w-full max-w-2xl'>
      <KangurPracticeGameProgress
        accent={sectionContent.accent}
        currentRound={roundIndex}
        dataTestId='calendar-interactive-progress-bar'
        totalRounds={totalRounds}
      />

      <div className='flex flex-col gap-6'>
        <CalendarInteractiveGuidanceCard
          accent={sectionContent.accent}
          prompt={guidancePrompt}
          title={guidanceTitle}
        />
        <CalendarInteractivePromptCard
          accent={sectionContent.accent}
          roundIndex={roundIndex}
          taskLabel={task.label}
          totalRounds={totalRounds}
          translations={translations}
        />

        <KangurDragDropContext onDragEnd={handleDragEnd}>
          <div
            className='soft-card flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/70 p-4'
            data-testid='calendar-interactive-calendar-shell'
          >
            <CalendarInteractiveMonthToolbar
              disabled={feedback !== null}
              monthName={monthName}
              onMonthChange={handleMonthChange}
              translations={translations}
              year={year}
            />
            {task.type === 'click_weekday_name' ? (
              <CalendarInteractiveWeekdayChoices
                disabled={feedback !== null}
                onWeekdayClick={handleWeekdayClick}
                translations={translations}
              />
            ) : null}
            <CalendarInteractiveDayGrid
              cells={cells}
              checkedAllWeekends={checkedAllWeekends}
              feedback={feedback}
              month={month}
              onCellClick={handleCellClick}
              task={task}
            />
            <CalendarInteractiveSeasonChoices
              accent={sectionContent.accent}
              feedback={feedback}
              isCoarsePointer={isCoarsePointer}
              monthName={monthName}
              onSeasonSelect={handleSeasonSelect}
              task={task}
              translations={translations}
            />
          </div>
        </KangurDragDropContext>
      </div>
    </KangurPracticeGameShell>
  );
}

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
  const { prompt: guidancePrompt, title: guidanceTitle } = resolveCalendarInteractiveGuidance({
    section,
    translations,
  });
  const cells = getCalendarCells(month, year);
  const monthName = getCalendarInteractiveMonthName(translations, month);

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
      <CalendarInteractiveGameSummaryView
        handleFinish={handleFinish}
        handleRestart={handleRestart}
        score={score}
        totalRounds={TOTAL_ROUNDS}
        translations={translations}
      />
    );
  }

  const handleCellClick = (day: number | null): void => {
    if (day === null || feedback !== null) {
      return;
    }
    if (task.type === 'click_date') {
      handleCalendarInteractiveDateSelection({
        day,
        setFeedback,
        setScore,
        targetDay: task.targetDay,
      });
      return;
    }
    if (task.type === 'click_all_weekends') {
      handleCalendarInteractiveWeekendSelection({
        checkedAllWeekends,
        day,
        month,
        setCheckedAllWeekends,
        setFeedback,
        setScore,
        targetCount: task.targets.length,
        weekendDayIndex: task.dayIdx,
        year,
      });
    }
  };

  const handleDragEnd = (result: DropResult): void => {
    if (feedback !== null || !result.destination || task.type !== 'drag_season') {
      return;
    }

    handleCalendarInteractiveSeasonDrop({
      correctSeason: task.correctSeason,
      droppableId: result.destination.droppableId,
      setFeedback,
      setScore,
    });
  };

  const handleMonthChange = (delta: number): void => {
    if (feedback !== null) {
      return;
    }

    if (task.type === 'flip_month') {
      handleCalendarInteractiveMonthFlip({
        month,
        delta,
        setFeedback,
        setMonth,
        setScore,
        targetMonth: task.targetMonth,
      });
      return;
    }

    setMonth((current) => (current + delta + 12) % 12);
  };

  const handleWeekdayClick = (idx: number): void => {
    if (feedback !== null || task.type !== 'click_weekday_name') {
      return;
    }

    handleCalendarInteractiveWeekdaySelection({
      idx,
      setFeedback,
      setScore,
      targetIdx: task.targetIdx,
    });
  };

  const handleSeasonSelect = (seasonId: Season): void => {
    if (feedback !== null || task.type !== 'drag_season') {
      return;
    }

    handleCalendarInteractiveSeasonSelection({
      correctSeason: task.correctSeason,
      seasonId,
      setFeedback,
      setScore,
    });
  };

  return (
    <CalendarInteractiveRoundView
      cells={cells}
      checkedAllWeekends={checkedAllWeekends}
      feedback={feedback}
      guidancePrompt={guidancePrompt}
      guidanceTitle={guidanceTitle}
      handleCellClick={handleCellClick}
      handleDragEnd={handleDragEnd}
      handleMonthChange={handleMonthChange}
      handleSeasonSelect={handleSeasonSelect}
      handleWeekdayClick={handleWeekdayClick}
      isCoarsePointer={isCoarsePointer}
      month={month}
      monthName={monthName}
      roundIndex={roundIndex}
      sectionContent={sectionContent}
      task={task}
      totalRounds={TOTAL_ROUNDS}
      translations={translations}
      year={year}
    />
  );
}

export default CalendarInteractiveGame;

export type { CalendarInteractiveSectionId } from './CalendarInteractiveGame.types';
