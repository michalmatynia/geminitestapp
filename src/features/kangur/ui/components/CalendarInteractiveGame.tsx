'use client';

import { Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { KangurDragDropContext } from '@/features/kangur/ui/components/KangurDragDropContext';

import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
import {
  KangurPracticeGameProgress,
  KangurPracticeGameStage,
  KangurPracticeGameSummary,
  KangurPracticeGameSummaryActions,
  KangurPracticeGameSummaryEmoji,
  KangurPracticeGameSummaryMessage,
  KangurPracticeGameSummaryProgress,
  KangurPracticeGameSummaryTitle,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';
import {
  KangurButton,
  KangurInfoCard,
} from '@/features/kangur/ui/design/primitives';
import {
  getKangurMiniGameAccuracyText,
  getKangurMiniGameFinishLabel,
  getKangurMiniGameScoreLabel,
  type KangurMiniGameTranslate,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_STACK_ROW_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import type { KangurMiniGameBinaryFeedbackState } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type CalendarInteractiveGameProps = {
  onFinish: () => void;
  section?: CalendarInteractiveTaskPoolId;
};

type CalendarInteractiveTranslate = KangurMiniGameTranslate;

const MONTHS_DATA = [
  { id: 'january', days: 31, season: 'winter' },
  { id: 'february', days: 28, season: 'winter' },
  { id: 'march', days: 31, season: 'spring' },
  { id: 'april', days: 30, season: 'spring' },
  { id: 'may', days: 31, season: 'spring' },
  { id: 'june', days: 30, season: 'summer' },
  { id: 'july', days: 31, season: 'summer' },
  { id: 'august', days: 31, season: 'summer' },
  { id: 'september', days: 30, season: 'autumn' },
  { id: 'october', days: 31, season: 'autumn' },
  { id: 'november', days: 30, season: 'autumn' },
  { id: 'december', days: 31, season: 'winter' },
] as const;

const WEEKDAYS = [
  { id: 'monday', short: 'mondayShort', abbr: 'mondayAbbr', full: 'monday', lookup: 'monday' },
  { id: 'tuesday', short: 'tuesdayShort', abbr: 'tuesdayAbbr', full: 'tuesday', lookup: 'tuesday' },
  {
    id: 'wednesday',
    short: 'wednesdayShort',
    abbr: 'wednesdayAbbr',
    full: 'wednesday',
    lookup: 'wednesday',
  },
  {
    id: 'thursday',
    short: 'thursdayShort',
    abbr: 'thursdayAbbr',
    full: 'thursday',
    lookup: 'thursday',
  },
  { id: 'friday', short: 'fridayShort', abbr: 'fridayAbbr', full: 'friday', lookup: 'friday' },
  {
    id: 'saturday',
    short: 'saturdayShort',
    abbr: 'saturdayAbbr',
    full: 'saturday',
    lookup: 'saturday',
  },
  {
    id: 'sunday',
    short: 'sundayShort',
    abbr: 'sundayAbbr',
    full: 'sunday',
    lookup: 'sunday',
  },
] as const;
const SEASONS = [
  { id: 'spring', emoji: '🌸', accent: 'emerald' },
  { id: 'summer', emoji: '☀️', accent: 'amber' },
  { id: 'autumn', emoji: '🍂', accent: 'rose' },
  { id: 'winter', emoji: '❄️', accent: 'sky' },
] as const;
const SEASON_ACCENTS: Record<Season, KangurAccent> = {
  spring: 'emerald',
  summer: 'amber',
  autumn: 'rose',
  winter: 'sky',
};
const dragPortal = typeof document === 'undefined' ? null : document.body;

const seasonDroppableId = (season: Season): string => {
  const index = SEASONS.findIndex((candidate) => candidate.id === season);
  return index >= 0 ? `season-${index}` : 'season-unknown';
};

const resolveSeasonFromDroppableId = (droppableId: string): Season | null => {
  if (!droppableId.startsWith('season-')) return null;
  const index = Number.parseInt(droppableId.replace('season-', ''), 10);
  return Number.isNaN(index) ? null : (SEASONS[index]?.id ?? null);
};

type Season = (typeof SEASONS)[number]['id'];
export type CalendarInteractiveSectionId = 'dni' | 'miesiace' | 'data';
export type CalendarInteractiveTaskPoolId = CalendarInteractiveSectionId | 'mixed';

type ClickWeekdayNameTask = {
  type: 'click_weekday_name';
  targetIdx: number;
  label: string;
};

type ClickDateTask = {
  type: 'click_date';
  targetDay: number;
  month: number;
  year: number;
  label: string;
};

type DragSeasonTask = {
  type: 'drag_season';
  monthName: string;
  correctSeason: Season;
  label: string;
};

type FlipMonthTask = {
  type: 'flip_month';
  targetMonth: number;
  label: string;
};

type ClickAllWeekendsTask = {
  type: 'click_all_weekends';
  targets: number[];
  dayIdx: 5 | 6;
  label: string;
};

type Task =
  | ClickWeekdayNameTask
  | ClickDateTask
  | DragSeasonTask
  | FlipMonthTask
  | ClickAllWeekendsTask;

type TaskType = Task['type'];

type CalendarInteractiveSectionContent = {
  accent: KangurAccent;
};

export const CALENDAR_INTERACTIVE_TASK_TYPE_POOLS: Record<
  CalendarInteractiveTaskPoolId,
  readonly TaskType[]
> = {
  mixed: [
    'click_weekday_name',
    'click_date',
    'drag_season',
    'flip_month',
    'click_all_weekends',
  ],
  dni: ['click_weekday_name', 'click_all_weekends'],
  miesiace: ['drag_season', 'flip_month'],
  data: ['click_date'],
};

export function getCalendarInteractiveSectionContent(
  section: CalendarInteractiveTaskPoolId
): CalendarInteractiveSectionContent {
  switch (section) {
    case 'dni':
      return {
        accent: 'emerald',
      };
    case 'miesiace':
      return {
        accent: 'amber',
      };
    case 'data':
      return {
        accent: 'indigo',
      };
    default:
      return {
        accent: 'emerald',
      };
  }
}

function getCalendarCells(month: number, year: number): Array<number | null> {
  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay + 6) % 7; // Monday = 0
  const monthData = MONTHS_DATA[month] ?? MONTHS_DATA[0];
  const cells: Array<number | null> = [];

  for (let i = 0; i < offset; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= monthData.days; day += 1) {
    cells.push(day);
  }

  return cells;
}

function getDayOfWeek(year: number, month: number, day: number): number {
  const jsDay = new Date(year, month, day).getDay();
  return (jsDay + 6) % 7;
}

const getCalendarInteractiveMonthName = (
  translate: CalendarInteractiveTranslate,
  month: number
): string =>
  translate(`calendarInteractive.months.${MONTHS_DATA[month]?.id ?? MONTHS_DATA[0].id}`);

const getCalendarInteractiveWeekdayShort = (
  translate: CalendarInteractiveTranslate,
  dayIdx: number
): string =>
  translate(
    `calendarInteractive.weekdays.short.${WEEKDAYS[dayIdx]?.short ?? WEEKDAYS[0].short}`
  );

const getCalendarInteractiveWeekdayAbbr = (
  translate: CalendarInteractiveTranslate,
  dayIdx: number
): string =>
  translate(
    `calendarInteractive.weekdays.abbr.${WEEKDAYS[dayIdx]?.abbr ?? WEEKDAYS[0].abbr}`
  );

const getCalendarInteractiveWeekdayFull = (
  translate: CalendarInteractiveTranslate,
  dayIdx: number
): string =>
  translate(
    `calendarInteractive.weekdays.full.${WEEKDAYS[dayIdx]?.full ?? WEEKDAYS[0].full}`
  );

const getCalendarInteractiveWeekdayLookup = (
  translate: CalendarInteractiveTranslate,
  dayIdx: number
): string =>
  translate(
    `calendarInteractive.weekdays.lookup.${WEEKDAYS[dayIdx]?.lookup ?? WEEKDAYS[0].lookup}`
  );

const getCalendarInteractiveSeasonLabel = (
  translate: CalendarInteractiveTranslate,
  season: Season
): string => translate(`calendarInteractive.seasons.${season}`);

function generateTask(
  month: number,
  year: number,
  translate: CalendarInteractiveTranslate,
  section: CalendarInteractiveTaskPoolId = 'mixed'
): Task {
  const taskTypes = CALENDAR_INTERACTIVE_TASK_TYPE_POOLS[section];
  const type =
    taskTypes[Math.floor(Math.random() * taskTypes.length)] ??
    CALENDAR_INTERACTIVE_TASK_TYPE_POOLS.mixed[0];
  const cells = getCalendarCells(month, year);
  const validDays = cells.filter((day): day is number => day !== null);

  if (type === 'click_weekday_name') {
    const targetIdx = Math.floor(Math.random() * 7);
    return {
      type: 'click_weekday_name',
      targetIdx,
      label: translate('calendarInteractive.tasks.clickWeekday', {
        dayLabel: getCalendarInteractiveWeekdayAbbr(translate, targetIdx),
      }),
    };
  }

  if (type === 'click_date') {
    const dayIdx = Math.floor(Math.random() * 7);
    const matches = validDays.filter((day) => getDayOfWeek(year, month, day) === dayIdx);
    if (matches.length === 0) {
      return generateTask(month, year, translate, section);
    }
    const target = matches[Math.floor(Math.random() * matches.length)] ?? matches[0] ?? 1;

    return {
      type: 'click_date',
      targetDay: target,
      month,
      year,
      label: translate('calendarInteractive.tasks.clickDate', {
        weekdayName: getCalendarInteractiveWeekdayLookup(translate, dayIdx),
      }),
    };
  }

  if (type === 'drag_season') {
    const monthIndex = Math.floor(Math.random() * 12);
    const monthData = MONTHS_DATA[monthIndex] ?? MONTHS_DATA[0];
    return {
      type: 'drag_season',
      monthName: getCalendarInteractiveMonthName(translate, monthIndex),
      correctSeason: monthData.season,
      label: translate('calendarInteractive.tasks.dragSeason', {
        monthName: getCalendarInteractiveMonthName(translate, monthIndex),
      }),
    };
  }

  if (type === 'flip_month') {
    const targetMonth = Math.floor(Math.random() * 12);
    return {
      type: 'flip_month',
      targetMonth,
      label: translate('calendarInteractive.tasks.flipMonth', {
        monthNumber: targetMonth + 1,
        monthName: getCalendarInteractiveMonthName(translate, targetMonth),
      }),
    };
  }

  const isSaturday = Math.random() > 0.5;
  const dayIdx: 5 | 6 = isSaturday ? 5 : 6;
  const targets = validDays.filter((day) => getDayOfWeek(year, month, day) === dayIdx);
  return {
    type: 'click_all_weekends',
    targets,
    dayIdx,
    label: translate('calendarInteractive.tasks.clickAllWeekends', {
      dayName: translate(
        isSaturday
          ? 'calendarInteractive.weekends.saturdays'
          : 'calendarInteractive.weekends.sundays'
      ),
    }),
  };
}

export default function CalendarInteractiveGame({
  onFinish,
  section = 'mixed',
}: CalendarInteractiveGameProps): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');
  const YEAR = 2025;
  const TOTAL = 6;

  const [month, setMonth] = useState(0);
  const [task, setTask] = useState<Task>(() => generateTask(0, YEAR, translations, section));
  const [feedback, setFeedback] = useState<KangurMiniGameBinaryFeedbackState>(null);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [selectedWeekdayIdx, setSelectedWeekdayIdx] = useState<number | null>(null);
  const trainingSectionContent = getCalendarInteractiveSectionContent(section);
  const showCalendarError =
    feedback === 'wrong' && (task.type === 'click_date' || task.type === 'click_all_weekends');
  const showFlipMonthError = feedback === 'wrong' && task.type === 'flip_month';
  const handleFinishSession = (): void => {
    onFinish();
  };

  const nextRound = (correct: boolean): void => {
    const nextScore = correct ? score + 1 : score;
    setScore(nextScore);
    setFeedback(correct ? 'correct' : 'wrong');

    setTimeout(() => {
      setSelectedDays([]);
      setSelectedSeason(null);
      setSelectedWeekdayIdx(null);
      setFeedback(null);
      if (round + 1 >= TOTAL) {
        setDone(true);
        return;
      }

      const nextMonth = Math.floor(Math.random() * 12);
      setMonth(nextMonth);
      setTask(generateTask(nextMonth, YEAR, translations, section));
      setRound((currentRound) => currentRound + 1);
    }, 1300);
  };

  const handleWeekdayNameClick = (idx: number): void => {
    if (feedback) return;
    if (task.type !== 'click_weekday_name') return;
    setSelectedWeekdayIdx(idx);
    nextRound(idx === task.targetIdx);
  };

  const handleDateClick = (day: number): void => {
    if (feedback) return;

    if (task.type === 'click_date') {
      setSelectedDays([day]);
      nextRound(day === task.targetDay);
      return;
    }

    if (task.type === 'click_all_weekends') {
      if (selectedDays.includes(day)) {
        return;
      }

      const newSelectedDays = [...selectedDays, day];
      setSelectedDays(newSelectedDays);

      const allTargetsSelected = task.targets.every((target) => newSelectedDays.includes(target));
      if (newSelectedDays.length === task.targets.length && allTargetsSelected) {
        nextRound(true);
      } else if (newSelectedDays.length >= task.targets.length) {
        nextRound(false);
      }
    }
  };

  const handleFlipMonth = (dir: number): void => {
    if (feedback) return;
    const nextMonth = (month + dir + 12) % 12;
    setMonth(nextMonth);
    if (task.type === 'flip_month' && nextMonth === task.targetMonth) {
      nextRound(true);
    }
  };

  const handleDrop = (season: Season): void => {
    if (feedback) return;
    if (task.type !== 'drag_season') return;
    setSelectedSeason(season);
    nextRound(season === task.correctSeason);
  };

  const handleSeasonDragEnd = (result: DropResult): void => {
    const destination = result.destination;
    if (!destination) return;
    const season = resolveSeasonFromDroppableId(destination.droppableId);
    if (!season) return;
    handleDrop(season);
  };

  const restart = (): void => {
    const startMonth = 0;
    setRound(0);
    setScore(0);
    setDone(false);
    setFeedback(null);
    setSelectedDays([]);
    setSelectedSeason(null);
    setSelectedWeekdayIdx(null);
    setMonth(startMonth);
    setTask(generateTask(startMonth, YEAR, translations, section));
  };

  const cells = getCalendarCells(month, YEAR);
  const monthName = getCalendarInteractiveMonthName(translations, month);

  if (done) {
    const percent = Math.round((score / TOTAL) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='calendar-interactive-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          ariaHidden
          dataTestId='calendar-interactive-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 60 ? '🌟' : '💪'}
        />
        <KangurPracticeGameSummaryTitle
          accent='emerald'
          dataTestId='calendar-interactive-summary-title'
          title={getKangurMiniGameScoreLabel(translations, score, TOTAL)}
        />
        <KangurPracticeGameSummaryProgress
          accent='emerald'
          ariaLabel={translations('calendarInteractive.progressAriaLabel')}
          ariaValueText={getKangurMiniGameAccuracyText(translations, percent)}
          dataTestId='calendar-interactive-summary-progress-bar'
          percent={percent}
        />
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? translations(`calendarInteractive.summary.${section}.perfect`)
            : percent >= 60
              ? translations(`calendarInteractive.summary.${section}.retry`)
              : translations(
                  section === 'mixed'
                    ? 'calendarInteractive.summary.mixed.encouragement'
                    : 'calendarInteractive.summary.sectionEncouragement'
                )}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          className={KANGUR_STACK_ROW_CLASSNAME}
          finishButtonClassName='w-full sm:flex-1'
          finishLabel={getKangurMiniGameFinishLabel(translations, 'back')}
          onFinish={handleFinishSession}
          onRestart={restart}
          restartLabel={translations('shared.restart')}
          restartButtonClassName='w-full sm:flex-1'
        />
      </KangurPracticeGameSummary>
    );
  }

  return (
    <KangurPracticeGameStage className='mx-auto max-w-lg'>
      {section !== 'mixed' ? (
        <KangurInfoCard
          accent={trainingSectionContent.accent}
          className='w-full rounded-[24px]'
          data-testid='calendar-interactive-guidance'
          padding='sm'
          tone='accent'
        >
          <p
            className='text-sm font-semibold [color:var(--kangur-page-text)]'
            data-testid='calendar-interactive-guidance-title'
          >
            {translations(`calendarInteractive.section.${section}.guidanceTitle`)}
          </p>
          <p className='mt-2 text-sm font-normal leading-relaxed [color:var(--kangur-page-text)]'>
            {translations(`calendarInteractive.section.${section}.guidance`)}
          </p>
        </KangurInfoCard>
      ) : null}
      <KangurPracticeGameProgress
        accent='emerald'
        currentRound={round}
        dataTestId='calendar-interactive-progress-bar'
        totalRounds={TOTAL}
      />

      <motion.div
        key={round}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className='w-full'
      >
        <KangurInfoCard
          accent='emerald'
          className='w-full rounded-[24px] text-center'
          data-testid='calendar-interactive-prompt'
          padding='sm'
          tone='accent'
        >
          {section !== 'mixed' ? (
            <p className='text-xs font-extrabold uppercase tracking-[0.12em] text-green-800/75'>
              {translations(`calendarInteractive.section.${section}.promptLabel`)}
            </p>
          ) : null}
          <p className='text-sm font-bold text-green-800'>📅 {task.label}</p>
        </KangurInfoCard>
      </motion.div>

      {(task.type === 'click_date' ||
        task.type === 'click_all_weekends' ||
        task.type === 'flip_month') && (
        <>
          <KangurInfoCard
            className='w-full rounded-[24px]'
            data-testid='calendar-interactive-calendar-shell'
            padding='sm'
            tone='neutral'
          >
            <div className='flex items-center justify-between mb-2'>
              <KangurButton
                aria-label={translations('calendarInteractive.inRound.previousMonth')}
                onClick={() => handleFlipMonth(-1)}
                className='h-9 w-9 min-w-0 px-0'
                size='sm'
                type='button'
                variant='surface'
              >
                <ChevronLeft
                  aria-hidden='true'
                  className='w-4 h-4 [color:var(--kangur-page-muted-text)]'
                />
              </KangurButton>
              <p className='font-extrabold text-green-700 text-sm'>
                {monthName} {YEAR}
              </p>
              <KangurButton
                aria-label={translations('calendarInteractive.inRound.nextMonth')}
                onClick={() => handleFlipMonth(1)}
                className='h-9 w-9 min-w-0 px-0'
                size='sm'
                type='button'
                variant='surface'
              >
                <ChevronRight
                  aria-hidden='true'
                  className='w-4 h-4 [color:var(--kangur-page-muted-text)]'
                />
              </KangurButton>
            </div>

            <div className='grid grid-cols-7 gap-0.5 text-center mb-1'>
              {WEEKDAYS.map((dayMeta, idx) => (
                <div
                  key={dayMeta.id}
                  className={`text-xs font-bold py-0.5 ${
                    idx >= 5
                      ? 'text-red-400'
                      : '[color:var(--kangur-page-muted-text)]'
                  }`}
                >
                  {getCalendarInteractiveWeekdayShort(translations, idx)}
                </div>
              ))}
            </div>

            <div className='grid grid-cols-7 gap-0.5 text-center'>
              {cells.map((day, idx) => {
                const isWeekend = idx % 7 >= 5;
                const isNumberDay = typeof day === 'number';
                const isClickable =
                  isNumberDay &&
                  feedback === null &&
                  (task.type === 'click_date' || task.type === 'click_all_weekends');
                const isSelected = isNumberDay && selectedDays.includes(day);
                const isTarget =
                  task.type === 'click_date' &&
                  isNumberDay &&
                  day === task.targetDay &&
                  feedback === 'correct';
                const isWrongDateSelection =
                  task.type === 'click_date' && isSelected && feedback === 'wrong';
                const isClicked =
                  task.type === 'click_all_weekends' &&
                  isNumberDay &&
                  isSelected &&
                  feedback === null;
                const isWrongWeekendSelection =
                  task.type === 'click_all_weekends' &&
                  isNumberDay &&
                  isSelected &&
                  feedback === 'wrong' &&
                  !task.targets.includes(day);
                const isCorrectWeekend =
                  task.type === 'click_all_weekends' &&
                  isNumberDay &&
                  task.targets.includes(day) &&
                  feedback !== null;
                let dayAccent: KangurAccent = isWeekend ? 'rose' : 'slate';
                let dayEmphasis: 'neutral' | 'accent' = 'neutral';
                let dayClassName = cn(
                  'h-10 rounded-[16px] text-xs font-semibold',
                  'flex items-center justify-center leading-none !p-0 !text-center',
                  isWeekend ? 'text-rose-600' : '[color:var(--kangur-page-text)]',
                  !isClickable && 'cursor-default hover:translate-y-0'
                );

                if (isTarget) {
                  dayAccent = 'emerald';
                  dayEmphasis = 'accent';
                  dayClassName = cn(dayClassName, KANGUR_ACCENT_STYLES.emerald.activeText);
                } else if (isWrongDateSelection) {
                  dayAccent = 'rose';
                  dayEmphasis = 'accent';
                  dayClassName = cn(dayClassName, KANGUR_ACCENT_STYLES.rose.activeText);
                } else if (isClicked) {
                  dayAccent = 'teal';
                  dayEmphasis = 'accent';
                  dayClassName = cn(
                    dayClassName,
                    KANGUR_ACCENT_STYLES.teal.activeText,
                    'scale-[1.02]'
                  );
                } else if (isWrongWeekendSelection) {
                  dayAccent = 'rose';
                  dayEmphasis = 'accent';
                  dayClassName = cn(dayClassName, KANGUR_ACCENT_STYLES.rose.activeText);
                } else if (isCorrectWeekend && !isSelected) {
                  dayAccent = 'emerald';
                  dayEmphasis = 'accent';
                  dayClassName = cn(dayClassName, KANGUR_ACCENT_STYLES.emerald.activeText);
                }

                return isNumberDay ? (
                  <KangurAnswerChoiceCard
                    accent={dayAccent}
                    buttonClassName={dayClassName}
                    emphasis={dayEmphasis}
                    hoverScale={1}
                    interactive={isClickable}
                    key={`${idx}-${day}`}
                    onClick={() => {
                      if (isClickable) {
                        handleDateClick(day);
                      }
                    }}
                    data-testid={`calendar-day-${day}`}
                    tapScale={1}
                    type='button'
                  >
                    {day}
                  </KangurAnswerChoiceCard>
                ) : (
                  <div key={`${idx}-empty`} aria-hidden='true' className='h-10 rounded-[16px]' />
                );
              })}
            </div>
          </KangurInfoCard>
          {showCalendarError ? (
            <div
              className='mt-2 w-full text-center text-xs font-semibold text-rose-600'
              data-testid='calendar-interactive-feedback'
              role='status'
            >
              {translations('calendarInteractive.inRound.tryAgain')}
            </div>
          ) : null}
        </>
      )}

      {task.type === 'flip_month' && (
        <div className='flex w-full flex-col items-center gap-2'>
          <KangurButton
            className='w-full max-w-xs'
            onClick={() => {
              if (feedback) return;
              nextRound(month === task.targetMonth);
            }}
            size='lg'
            type='button'
            variant='primary'
          >
            {translations('calendarInteractive.inRound.done')}
          </KangurButton>
          <p className='text-xs [color:var(--kangur-page-muted-text)]'>
            {translations('calendarInteractive.inRound.confirmMonth')}
          </p>
          {showFlipMonthError ? (
            <div
              className='w-full text-center text-xs font-semibold text-rose-600'
              data-testid='calendar-interactive-feedback'
              role='status'
            >
              {translations('calendarInteractive.inRound.tryAgain')}
            </div>
          ) : null}
        </div>
      )}

      {task.type === 'click_weekday_name' && (
        <div className='mx-auto grid w-full max-w-lg grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-3'>
          {WEEKDAYS.map((dayMeta, idx) => {
            const isCorrectTarget = feedback !== null && idx === task.targetIdx;
            const isWrongSelection =
              feedback === 'wrong' &&
              selectedWeekdayIdx === idx &&
              idx !== task.targetIdx;
            const buttonAccent: KangurAccent = isCorrectTarget
              ? 'emerald'
              : isWrongSelection
                ? 'rose'
                : idx >= 5
                  ? 'rose'
                  : 'slate';
            const buttonEmphasis: 'neutral' | 'accent' =
              isCorrectTarget || isWrongSelection ? 'accent' : 'neutral';
            const className = cn(
              'rounded-[24px] px-3 py-2.5 text-[11px] sm:text-xs font-bold leading-snug text-center whitespace-normal min-h-[54px]',
              isCorrectTarget
                ? KANGUR_ACCENT_STYLES.emerald.activeText
                : isWrongSelection
                  ? KANGUR_ACCENT_STYLES.rose.activeText
                  : idx >= 5
                    ? 'text-rose-600'
                    : '[color:var(--kangur-page-text)]',
              feedback !== null && 'cursor-default'
            );

            return (
              <KangurAnswerChoiceCard
                accent={buttonAccent}
                buttonClassName={className}
                data-testid={`calendar-weekday-${idx}`}
                emphasis={buttonEmphasis}
                hoverScale={1.05}
                interactive={feedback === null}
                key={dayMeta.id}
                onClick={() => handleWeekdayNameClick(idx)}
                tapScale={0.95}
                type='button'
              >
                {getCalendarInteractiveWeekdayFull(translations, idx)}
              </KangurAnswerChoiceCard>
            );
          })}
        </div>
      )}

      {task.type === 'drag_season' && (
        <KangurDragDropContext onDragEnd={handleSeasonDragEnd}>
          <div className='flex flex-col items-center kangur-panel-gap w-full'>
            <Droppable droppableId='calendar-season-pool' direction='horizontal'>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className='flex w-full justify-center'
                >
                  <Draggable
                    draggableId='calendar-season'
                    index={0}
                    isDragDisabled={feedback !== null}
                  >
                    {(dragProvided, snapshot) => {
                      const content = (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className={cn(
                            'bg-green-400 text-white font-extrabold px-6 py-3 rounded-2xl shadow-lg cursor-grab active:cursor-grabbing select-none text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
                            snapshot.isDragging ? 'scale-[1.02] shadow-xl' : undefined
                          )}
                          aria-label={translations('calendarInteractive.inRound.monthAria', {
                            monthName: task.monthName,
                          })}
                          aria-disabled={feedback !== null}
                        >
                          📅 {task.monthName}
                        </div>
                      );

                      if (snapshot.isDragging && dragPortal) {
                        return createPortal(content, dragPortal);
                      }
                      return content;
                    }}
                  </Draggable>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            <p className='text-xs [color:var(--kangur-page-muted-text)]'>
              {translations('calendarInteractive.inRound.chooseSeason')}
            </p>

            <div className='grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2'>
              {SEASONS.map((seasonMeta, index) => {
                const accent = SEASON_ACCENTS[seasonMeta.id];
                const isCorrectSeason =
                  feedback !== null && seasonMeta.id === task.correctSeason;
                const isWrongSelectedSeason =
                  feedback === 'wrong' &&
                  selectedSeason === seasonMeta.id &&
                  seasonMeta.id !== task.correctSeason;
                const isMutedSeason =
                  feedback === 'wrong' &&
                  selectedSeason !== null &&
                  seasonMeta.id !== task.correctSeason &&
                  seasonMeta.id !== selectedSeason;

                return (
                  <Droppable
                    key={seasonMeta.id}
                    droppableId={seasonDroppableId(seasonMeta.id)}
                    isDropDisabled={feedback !== null}
                  >
                    {(provided, snapshot) => {
                      const isDragOverSeason = snapshot.isDraggingOver && feedback === null;

                      return (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className='w-full'
                        >
                          <KangurAnswerChoiceCard
                            accent={
                              isCorrectSeason ? 'emerald' : isWrongSelectedSeason ? 'rose' : accent
                            }
                            buttonClassName={cn(
                              'flex min-h-[108px] flex-col items-center justify-center gap-1 text-center',
                              isCorrectSeason
                                ? KANGUR_ACCENT_STYLES.emerald.activeText
                                : isWrongSelectedSeason
                                  ? KANGUR_ACCENT_STYLES.rose.activeText
                                  : KANGUR_ACCENT_STYLES[accent].activeText,
                              isDragOverSeason && 'scale-[1.02]',
                              isCorrectSeason && KANGUR_ACCENT_STYLES.emerald.activeText,
                              isWrongSelectedSeason && KANGUR_ACCENT_STYLES.rose.activeText,
                              isMutedSeason && 'opacity-70'
                            )}
                            data-testid={`calendar-season-${index}`}
                            emphasis={
                              isCorrectSeason || isWrongSelectedSeason || isDragOverSeason
                                ? 'accent'
                                : 'neutral'
                            }
                            interactive={feedback === null}
                            disabled={feedback !== null}
                            onClick={() => handleDrop(seasonMeta.id)}
                            type='button'
                          >
                            <span className='text-2xl'>{seasonMeta.emoji}</span>
                            <span className='text-xs font-bold'>
                              {getCalendarInteractiveSeasonLabel(translations, seasonMeta.id)}
                            </span>
                          </KangurAnswerChoiceCard>
                          {provided.placeholder}
                        </div>
                      );
                    }}
                  </Droppable>
                );
              })}
            </div>
          </div>
        </KangurDragDropContext>
      )}
    </KangurPracticeGameStage>
  );
}
