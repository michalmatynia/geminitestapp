import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
import {
  KangurPracticeGameProgress,
  KangurPracticeGameStage,
  KangurPracticeGameSummary,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';
import {
  KangurButton,
  KangurInfoCard,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import { cn } from '@/shared/utils';

type CalendarInteractiveGameProps = {
  onFinish: () => void;
  section?: CalendarInteractiveTaskPoolId;
};

type Feedback = 'correct' | 'wrong' | null;

const MONTHS_DATA = [
  { name: 'Styczeń', days: 31, season: '❄️ Zima' },
  { name: 'Luty', days: 28, season: '❄️ Zima' },
  { name: 'Marzec', days: 31, season: '🌸 Wiosna' },
  { name: 'Kwiecień', days: 30, season: '🌸 Wiosna' },
  { name: 'Maj', days: 31, season: '🌸 Wiosna' },
  { name: 'Czerwiec', days: 30, season: '☀️ Lato' },
  { name: 'Lipiec', days: 31, season: '☀️ Lato' },
  { name: 'Sierpień', days: 31, season: '☀️ Lato' },
  { name: 'Wrzesień', days: 30, season: '🍂 Jesień' },
  { name: 'Październik', days: 31, season: '🍂 Jesień' },
  { name: 'Listopad', days: 30, season: '🍂 Jesień' },
  { name: 'Grudzień', days: 31, season: '❄️ Zima' },
] as const;

const DAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'] as const;
const WEEKDAY_NAMES = [
  'poniedziałek',
  'wtorek',
  'środę',
  'czwartek',
  'piątek',
  'sobotę',
  'niedzielę',
] as const;
const SEASONS = ['🌸 Wiosna', '☀️ Lato', '🍂 Jesień', '❄️ Zima'] as const;
const SEASON_ACCENTS: Record<Season, KangurAccent> = {
  '🌸 Wiosna': 'emerald',
  '☀️ Lato': 'amber',
  '🍂 Jesień': 'rose',
  '❄️ Zima': 'sky',
};

type DayLabel = (typeof DAY_LABELS)[number];
type Season = (typeof SEASONS)[number];
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
  weekdayName: DayLabel;
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
  guidance: string;
  guidanceTitle: string;
  promptLabel: string;
  summaryPerfect: string;
  summaryRetry: string;
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

export function getCalendarInteractiveSectionLabel(
  section: CalendarInteractiveTaskPoolId
): string {
  switch (section) {
    case 'dni':
      return 'Dni tygodnia';
    case 'miesiace':
      return 'Miesiące i pory roku';
    case 'data':
      return 'Odczytywanie dat';
    default:
      return 'Mieszany kalendarz';
  }
}

export function getCalendarInteractiveSectionContent(
  section: CalendarInteractiveTaskPoolId
): CalendarInteractiveSectionContent {
  switch (section) {
    case 'dni':
      return {
        accent: 'emerald',
        guidance: 'Ćwiczysz nazwy dni tygodnia i rozpoznawanie weekendu w układzie kalendarza.',
        guidanceTitle: 'Trening dni tygodnia',
        promptLabel: 'Znajdź właściwy dzień tygodnia',
        summaryPerfect: 'Świetnie! Dni tygodnia i weekend rozpoznajesz bez wahania.',
        summaryRetry: 'Poćwicz jeszcze dni tygodnia i weekendowe kolumny.',
      };
    case 'miesiace':
      return {
        accent: 'amber',
        guidance: 'Ćwiczysz miesiące, ich kolejność oraz dopasowanie do odpowiedniej pory roku.',
        guidanceTitle: 'Trening miesięcy',
        promptLabel: 'Pracuj na miesiącach i porach roku',
        summaryPerfect: 'Świetnie! Miesiące i pory roku masz już dobrze uporządkowane.',
        summaryRetry: 'Poćwicz jeszcze kolejność miesięcy i ich pory roku.',
      };
    case 'data':
      return {
        accent: 'indigo',
        guidance: 'Ćwiczysz odczytywanie dat i wskazywanie konkretnego dnia w siatce kalendarza.',
        guidanceTitle: 'Trening dat',
        promptLabel: 'Odszukaj właściwą datę w kalendarzu',
        summaryPerfect: 'Świetnie! Sprawnie odczytujesz daty z kalendarza.',
        summaryRetry: 'Poćwicz jeszcze wyszukiwanie konkretnych dat w siatce kalendarza.',
      };
    default:
      return {
        accent: 'emerald',
        guidance: 'Raz ćwiczysz dni tygodnia, raz miesiące i pory roku, a raz konkretne daty.',
        guidanceTitle: 'Mieszany trening kalendarza',
        promptLabel: 'Rozwiązuj różne zadania kalendarzowe',
        summaryPerfect: 'Idealnie! Znasz kalendarz na wylot!',
        summaryRetry: 'Świetnie! Ćwicz dalej!',
      };
  }
}

export function getCalendarInteractiveSummaryMessage(
  section: CalendarInteractiveTaskPoolId,
  percent: number
): string {
  const content = getCalendarInteractiveSectionContent(section);
  if (percent === 100) {
    return content.summaryPerfect;
  }
  if (percent >= 60) {
    return content.summaryRetry;
  }
  return section === 'mixed'
    ? 'Nie poddawaj się!'
    : 'Nie poddawaj się. Jeszcze kilka prób i ta sekcja będzie prostsza.';
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

function generateTask(
  month: number,
  year: number,
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
    const dayLabel = DAY_LABELS[targetIdx] ?? DAY_LABELS[0];
    return {
      type: 'click_weekday_name',
      targetIdx,
      label: `Kliknij dzień tygodnia: "${dayLabel}"`,
    };
  }

  if (type === 'click_date') {
    const dayIdx = Math.floor(Math.random() * 7);
    const matches = validDays.filter((day) => getDayOfWeek(year, month, day) === dayIdx);
    if (matches.length === 0) {
      return generateTask(month, year, section);
    }
    const target = matches[Math.floor(Math.random() * matches.length)] ?? matches[0] ?? 1;

    return {
      type: 'click_date',
      targetDay: target,
      weekdayName: DAY_LABELS[dayIdx] ?? DAY_LABELS[0],
      month,
      year,
      label: `Kliknij datę w kalendarzu, która wypada w ${WEEKDAY_NAMES[dayIdx] ?? WEEKDAY_NAMES[0]}`,
    };
  }

  if (type === 'drag_season') {
    const monthIndex = Math.floor(Math.random() * 12);
    const monthData = MONTHS_DATA[monthIndex] ?? MONTHS_DATA[0];
    return {
      type: 'drag_season',
      monthName: monthData.name,
      correctSeason: monthData.season,
      label: `Przeciągnij miesiąc "${monthData.name}" do właściwej pory roku`,
    };
  }

  if (type === 'flip_month') {
    const targetMonth = Math.floor(Math.random() * 12);
    const monthData = MONTHS_DATA[targetMonth] ?? MONTHS_DATA[0];
    return {
      type: 'flip_month',
      targetMonth,
      label: `Przejdź do miesiąca o numerze ${targetMonth + 1} (${monthData.name})`,
    };
  }

  const isSaturday = Math.random() > 0.5;
  const dayIdx: 5 | 6 = isSaturday ? 5 : 6;
  const dayName = isSaturday ? 'soboty' : 'niedziele';
  const targets = validDays.filter((day) => getDayOfWeek(year, month, day) === dayIdx);
  return {
    type: 'click_all_weekends',
    targets,
    dayIdx,
    label: `Kliknij wszystkie ${dayName} w tym miesiącu`,
  };
}

export default function CalendarInteractiveGame({
  onFinish,
  section = 'mixed',
}: CalendarInteractiveGameProps): React.JSX.Element {
  const YEAR = 2025;
  const TOTAL = 6;

  const [month, setMonth] = useState(0);
  const [task, setTask] = useState<Task>(() => generateTask(0, YEAR, section));
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState<Season | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [selectedWeekdayIdx, setSelectedWeekdayIdx] = useState<number | null>(null);
  const trainingSectionContent = getCalendarInteractiveSectionContent(section);
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
      setTask(generateTask(nextMonth, YEAR, section));
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
    setDragOver(null);
    if (feedback) return;
    if (task.type !== 'drag_season') return;
    setSelectedSeason(season);
    nextRound(season === task.correctSeason);
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
    setDragOver(null);
    setMonth(startMonth);
    setTask(generateTask(startMonth, YEAR, section));
  };

  const cells = getCalendarCells(month, YEAR);
  const monthData = MONTHS_DATA[month] ?? MONTHS_DATA[0];

  if (done) {
    const percent = Math.round((score / TOTAL) * 100);
    return (
      <KangurPracticeGameSummary
        accent='emerald'
        actionsClassName='flex-col sm:flex-row'
        breakdown={[]}
        breakdownDataTestId='calendar-interactive-summary-breakdown'
        breakdownItemDataTestIdPrefix='calendar-interactive-summary-breakdown'
        dataTestId='calendar-interactive-summary-shell'
        emoji={percent === 100 ? '🏆' : percent >= 60 ? '🌟' : '💪'}
        emojiAriaHidden
        emojiDataTestId='calendar-interactive-summary-emoji'
        finishButtonClassName='w-full sm:flex-1'
        finishLabel='Wróć'
        message={getCalendarInteractiveSummaryMessage(section, percent)}
        onFinish={handleFinishSession}
        onRestart={restart}
        percent={percent}
        progressAccent='emerald'
        progressDataTestId='calendar-interactive-summary-progress-bar'
        restartButtonClassName='w-full sm:flex-1'
        title={`Wynik: ${score}/${TOTAL}`}
      />
    );
  }

  return (
    <KangurPracticeGameStage className='gap-3'>
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
            {trainingSectionContent.guidanceTitle}
          </p>
          <p className='mt-2 text-sm font-normal leading-relaxed [color:var(--kangur-page-text)]'>
            {trainingSectionContent.guidance}
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
              {trainingSectionContent.promptLabel}
            </p>
          ) : null}
          <p className='text-sm font-bold text-green-800'>📅 {task.label}</p>
        </KangurInfoCard>
      </motion.div>

      {(task.type === 'click_date' ||
        task.type === 'click_all_weekends' ||
        task.type === 'flip_month') && (
        <KangurInfoCard
          className='w-full rounded-[24px]'
          data-testid='calendar-interactive-calendar-shell'
          padding='sm'
          tone='neutral'
        >
          <div className='flex items-center justify-between mb-2'>
            <KangurButton
              aria-label='Poprzedni miesiąc'
              onClick={() => handleFlipMonth(-1)}
              className='h-9 w-9 min-w-0 px-0'
              size='sm'
              type='button'
              variant='surface'
            >
              <ChevronLeft className='w-4 h-4 [color:var(--kangur-page-muted-text)]' />
            </KangurButton>
            <p className='font-extrabold text-green-700 text-sm'>
              {monthData.name} {YEAR}
            </p>
            <KangurButton
              aria-label='Następny miesiąc'
              onClick={() => handleFlipMonth(1)}
              className='h-9 w-9 min-w-0 px-0'
              size='sm'
              type='button'
              variant='surface'
            >
              <ChevronRight className='w-4 h-4 [color:var(--kangur-page-muted-text)]' />
            </KangurButton>
          </div>

          <div className='grid grid-cols-7 gap-0.5 text-center mb-1'>
            {DAY_LABELS.map((dayLabel, idx) => (
              <div
                key={dayLabel}
                className={`text-xs font-bold py-0.5 ${
                  idx >= 5
                    ? 'text-red-400'
                    : '[color:var(--kangur-page-muted-text)]'
                }`}
              >
                {dayLabel}
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
      )}

      {task.type === 'click_weekday_name' && (
        <div className='grid w-full grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-4'>
          {DAY_LABELS.map((dayLabel, idx) => {
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
              'rounded-[24px] py-3 text-sm font-bold',
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
                key={dayLabel}
                onClick={() => handleWeekdayNameClick(idx)}
                tapScale={0.95}
                type='button'
              >
                {dayLabel}
              </KangurAnswerChoiceCard>
            );
          })}
        </div>
      )}

      {task.type === 'drag_season' && (
        <div className='flex flex-col items-center gap-3 w-full'>
          <div
            draggable
            className='bg-green-400 text-white font-extrabold px-6 py-3 rounded-2xl shadow-lg cursor-grab active:cursor-grabbing select-none text-lg'
          >
            📅 {task.monthName}
          </div>
          <p className='text-xs [color:var(--kangur-page-muted-text)]'>
            Przeciągnij powyżej na właściwą porę roku ⬇️
          </p>

          <div className='grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2'>
            {SEASONS.map((season, index) => {
              const accent = SEASON_ACCENTS[season];
              const isCorrectSeason = feedback !== null && season === task.correctSeason;
              const isWrongSelectedSeason =
                feedback === 'wrong' && selectedSeason === season && season !== task.correctSeason;
              const isDragOverSeason = dragOver === season && feedback === null;
              const isMutedSeason =
                feedback === 'wrong' &&
                selectedSeason !== null &&
                season !== task.correctSeason &&
                season !== selectedSeason;

              return (
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
                    isCorrectSeason &&
                      KANGUR_ACCENT_STYLES.emerald.activeText,
                    isWrongSelectedSeason && KANGUR_ACCENT_STYLES.rose.activeText,
                    isMutedSeason && 'opacity-70'
                  )}
                  data-testid={`calendar-season-${index}`}
                  emphasis={
                    isCorrectSeason || isWrongSelectedSeason || isDragOverSeason
                      ? 'accent'
                      : 'neutral'
                  }
                  interactive={false}
                  key={season}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOver(season);
                  }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleDrop(season);
                  }}
                  type='button'
                >
                  <span className='text-2xl'>{season.split(' ')[0]}</span>
                  <span className='text-xs font-bold'>{season.split(' ').slice(1).join(' ')}</span>
                </KangurAnswerChoiceCard>
              );
            })}
          </div>
        </div>
      )}
    </KangurPracticeGameStage>
  );
}
