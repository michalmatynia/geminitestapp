import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

import { KangurButton } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_OPTION_CARD_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import { cn } from '@/shared/utils';

type CalendarInteractiveGameProps = {
  onFinish: () => void;
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

function generateTask(month: number, year: number): Task {
  const type = Math.floor(Math.random() * 5);
  const cells = getCalendarCells(month, year);
  const validDays = cells.filter((day): day is number => day !== null);

  if (type === 0) {
    const targetIdx = Math.floor(Math.random() * 7);
    const dayLabel = DAY_LABELS[targetIdx] ?? DAY_LABELS[0];
    return {
      type: 'click_weekday_name',
      targetIdx,
      label: `Kliknij dzień tygodnia: "${dayLabel}"`,
    };
  }

  if (type === 1) {
    const dayIdx = Math.floor(Math.random() * 7);
    const matches = validDays.filter((day) => getDayOfWeek(year, month, day) === dayIdx);
    if (matches.length === 0) {
      return generateTask(month, year);
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

  if (type === 2) {
    const monthIndex = Math.floor(Math.random() * 12);
    const monthData = MONTHS_DATA[monthIndex] ?? MONTHS_DATA[0];
    return {
      type: 'drag_season',
      monthName: monthData.name,
      correctSeason: monthData.season,
      label: `Przeciągnij miesiąc "${monthData.name}" do właściwej pory roku`,
    };
  }

  if (type === 3) {
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
}: CalendarInteractiveGameProps): React.JSX.Element {
  const YEAR = 2025;
  const TOTAL = 6;

  const [month, setMonth] = useState(0);
  const [task, setTask] = useState<Task>(() => generateTask(0, YEAR));
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState<Season | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);

  const nextRound = (correct: boolean): void => {
    const nextScore = correct ? score + 1 : score;
    setScore(nextScore);
    setFeedback(correct ? 'correct' : 'wrong');

    setTimeout(() => {
      setSelectedDays([]);
      setSelectedSeason(null);
      setFeedback(null);
      if (round + 1 >= TOTAL) {
        setDone(true);
        return;
      }

      const nextMonth = Math.floor(Math.random() * 12);
      setMonth(nextMonth);
      setTask(generateTask(nextMonth, YEAR));
      setRound((currentRound) => currentRound + 1);
    }, 1300);
  };

  const handleWeekdayNameClick = (idx: number): void => {
    if (feedback) return;
    if (task.type !== 'click_weekday_name') return;
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
    setDragOver(null);
    setMonth(startMonth);
    setTask(generateTask(startMonth, YEAR));
  };

  const cells = getCalendarCells(month, YEAR);
  const monthData = MONTHS_DATA[month] ?? MONTHS_DATA[0];

  if (done) {
    const percent = Math.round((score / TOTAL) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className='flex flex-col items-center gap-4 bg-white rounded-3xl shadow-xl p-8 text-center w-full max-w-sm'
      >
        <div className='text-6xl'>{percent === 100 ? '🏆' : percent >= 60 ? '🌟' : '💪'}</div>
        <h2 className='text-2xl font-extrabold text-gray-800'>
          Wynik: {score}/{TOTAL}
        </h2>
        <div className='w-full bg-gray-100 rounded-full h-3 overflow-hidden'>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8 }}
            className='h-full bg-gradient-to-r from-green-400 to-teal-400 rounded-full'
          />
        </div>
        <p className='text-gray-500'>
          {percent === 100
            ? 'Idealnie! Znasz kalendarz na wylot!'
            : percent >= 60
              ? 'Świetnie! Ćwicz dalej!'
              : 'Nie poddawaj się!'}
        </p>
        <div className='flex gap-3 w-full'>
          <KangurButton
            onClick={restart}
            className='flex-1'
            size='lg'
            type='button'
            variant='secondary'
          >
            <RefreshCw className='w-4 h-4' /> Jeszcze raz
          </KangurButton>
          <KangurButton
            onClick={onFinish}
            className='flex-1'
            size='lg'
            type='button'
            variant='primary'
          >
            Wróć
          </KangurButton>
        </div>
      </motion.div>
    );
  }

  return (
    <div className='flex flex-col items-center gap-3 w-full max-w-sm'>
      <div className='flex items-center gap-2 w-full'>
        <div className='flex-1 h-2 bg-gray-100 rounded-full overflow-hidden'>
          <div
            style={{ width: `${(round / TOTAL) * 100}%` }}
            className='h-full bg-gradient-to-r from-green-400 to-teal-400 rounded-full transition-all duration-500'
          />
        </div>
        <span className='text-xs font-bold text-gray-400'>
          {round + 1}/{TOTAL}
        </span>
      </div>

      <motion.div
        key={round}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className='bg-green-50 border border-green-200 rounded-2xl px-4 py-3 w-full text-center'
      >
        <p className='text-sm font-bold text-green-800'>📅 {task.label}</p>
      </motion.div>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ opacity: 0 }}
            className={`text-xl font-extrabold px-5 py-2 rounded-2xl ${feedback === 'correct' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}
          >
            {feedback === 'correct' ? '🎉 Brawo!' : '❌ Nie tym razem!'}
          </motion.div>
        )}
      </AnimatePresence>

      {(task.type === 'click_date' ||
        task.type === 'click_all_weekends' ||
        task.type === 'flip_month') && (
        <div className='bg-white rounded-2xl shadow p-3 w-full'>
          <div className='flex items-center justify-between mb-2'>
            <KangurButton
              aria-label='Poprzedni miesiac'
              onClick={() => handleFlipMonth(-1)}
              className='h-9 w-9 min-w-0 px-0'
              size='sm'
              type='button'
              variant='secondary'
            >
              <ChevronLeft className='w-4 h-4 text-gray-500' />
            </KangurButton>
            <p className='font-extrabold text-green-700 text-sm'>
              {monthData.name} {YEAR}
            </p>
            <KangurButton
              aria-label='Nastepny miesiac'
              onClick={() => handleFlipMonth(1)}
              className='h-9 w-9 min-w-0 px-0'
              size='sm'
              type='button'
              variant='secondary'
            >
              <ChevronRight className='w-4 h-4 text-gray-500' />
            </KangurButton>
          </div>

          <div className='grid grid-cols-7 gap-0.5 text-center mb-1'>
            {DAY_LABELS.map((dayLabel, idx) => (
              <div
                key={dayLabel}
                className={`text-xs font-bold py-0.5 ${idx >= 5 ? 'text-red-400' : 'text-gray-400'}`}
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
                task.type === 'click_all_weekends' && isNumberDay && isSelected && feedback === null;
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
              const dayClassName = !isNumberDay
                ? 'h-10 rounded-[16px]'
                : cn(
                  KANGUR_OPTION_CARD_CLASSNAME,
                  'h-10 rounded-[16px] p-0 text-xs font-semibold',
                  isWeekend ? 'text-rose-600' : 'text-slate-700',
                  isWeekend
                    ? cn('border-rose-200/80', KANGUR_ACCENT_STYLES.rose.hoverCard)
                    : cn('border-slate-200/80', KANGUR_ACCENT_STYLES.slate.hoverCard),
                  !isClickable && 'cursor-default hover:translate-y-0',
                  isTarget &&
                      cn(
                        KANGUR_ACCENT_STYLES.emerald.activeCard,
                        KANGUR_ACCENT_STYLES.emerald.activeText
                      ),
                  isWrongDateSelection &&
                      cn(
                        KANGUR_ACCENT_STYLES.rose.activeCard,
                        KANGUR_ACCENT_STYLES.rose.activeText
                      ),
                  isClicked &&
                      cn(
                        KANGUR_ACCENT_STYLES.teal.activeCard,
                        KANGUR_ACCENT_STYLES.teal.activeText,
                        'scale-[1.02]'
                      ),
                  isWrongWeekendSelection &&
                      cn(
                        KANGUR_ACCENT_STYLES.rose.activeCard,
                        KANGUR_ACCENT_STYLES.rose.activeText
                      ),
                  isCorrectWeekend &&
                      !isSelected &&
                      cn(
                        KANGUR_ACCENT_STYLES.emerald.activeCard,
                        KANGUR_ACCENT_STYLES.emerald.activeText
                      )
                );

              return (
                isNumberDay ? (
                  <button
                    key={`${idx}-${day}`}
                    type='button'
                    onClick={() => handleDateClick(day)}
                    disabled={!isClickable}
                    className={dayClassName}
                    data-testid={`calendar-day-${day}`}
                  >
                    {day}
                  </button>
                ) : (
                  <div key={`${idx}-empty`} aria-hidden='true' className={dayClassName} />
                )
              );
            })}
          </div>
        </div>
      )}

      {task.type === 'click_weekday_name' && (
        <div className='grid grid-cols-4 gap-2 w-full'>
          {DAY_LABELS.map((dayLabel, idx) => {
            const className =
              feedback && idx === task.targetIdx
                ? cn(
                  KANGUR_ACCENT_STYLES.emerald.activeCard,
                  KANGUR_ACCENT_STYLES.emerald.activeText
                )
                : idx >= 5
                  ? cn('border-rose-200/80', KANGUR_ACCENT_STYLES.rose.hoverCard)
                  : cn('border-slate-200/80', KANGUR_ACCENT_STYLES.slate.hoverCard);

            return (
              <motion.button
                key={dayLabel}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleWeekdayNameClick(idx)}
                disabled={feedback !== null}
                className={cn(
                  KANGUR_OPTION_CARD_CLASSNAME,
                  'rounded-[24px] py-3 text-sm font-bold',
                  idx >= 5 ? 'text-rose-600' : 'text-slate-700',
                  className
                )}
              >
                {dayLabel}
              </motion.button>
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
          <p className='text-xs text-gray-400'>Przeciągnij powyżej na właściwą porę roku ⬇️</p>

          <div className='grid grid-cols-2 gap-2 w-full'>
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
                <div
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
                  className={cn(
                    KANGUR_OPTION_CARD_CLASSNAME,
                    'flex min-h-[108px] flex-col items-center justify-center gap-1 rounded-[24px] text-center',
                    KANGUR_ACCENT_STYLES[accent].activeText,
                    cn('border-slate-200/80', KANGUR_ACCENT_STYLES[accent].hoverCard),
                    isDragOverSeason &&
                      cn(KANGUR_ACCENT_STYLES[accent].activeCard, 'scale-[1.02]'),
                    isCorrectSeason &&
                      cn(
                        KANGUR_ACCENT_STYLES.emerald.activeCard,
                        KANGUR_ACCENT_STYLES.emerald.activeText
                      ),
                    isWrongSelectedSeason &&
                      cn(
                        KANGUR_ACCENT_STYLES.rose.activeCard,
                        KANGUR_ACCENT_STYLES.rose.activeText
                      ),
                    isMutedSeason && 'opacity-70'
                  )}
                  data-testid={`calendar-season-${index}`}
                >
                  <span className='text-2xl'>{season.split(' ')[0]}</span>
                  <span className='text-xs font-bold'>
                    {season.split(' ').slice(1).join(' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
