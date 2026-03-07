// @ts-nocheck
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, RefreshCw, XCircle } from 'lucide-react';

import { KangurButton, KangurPanel } from '@/features/kangur/ui/design/primitives';
import {
  addXp,
  buildLessonMasteryUpdate,
  XP_REWARDS,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

type ClockTrainingGameProps = {
  onFinish: () => void;
};

type ClockTask = {
  hours: number;
  minutes: number;
};

type Feedback = 'correct' | 'wrong' | null;
type Hand = 'hour' | 'minute';
type MinuteSnapMode = '5min' | '1min';
type ClockGameMode = 'practice' | 'challenge';

type ClockFeedback = {
  kind: Feedback;
  title: string;
  details: string;
  tone?: 'near' | 'far';
};

type DraggableClockProps = {
  onSubmit: (hours: number, minutes: number) => void;
  showChallengeRing?: boolean;
  challengeTimeLeft?: number;
  challengeTimeLimit?: number;
};

const TASKS: ClockTask[] = [
  { hours: 3, minutes: 0 },
  { hours: 7, minutes: 30 },
  { hours: 1, minutes: 15 },
  { hours: 10, minutes: 45 },
  { hours: 6, minutes: 0 },
  { hours: 4, minutes: 20 },
  { hours: 9, minutes: 35 },
  { hours: 12, minutes: 0 },
  { hours: 2, minutes: 50 },
  { hours: 11, minutes: 25 },
];

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function createClockTaskSet(): ClockTask[] {
  return shuffle(TASKS).slice(0, INITIAL_TASK_COUNT);
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

const CLOCK_MINUTES_IN_CYCLE = 12 * 60;
const MINUTE_STEP = 5;
const INITIAL_TASK_COUNT = 5;
const CHALLENGE_TIME_LIMIT_SECONDS = 20;
const MINUTE_STEP_BY_MODE: Record<MinuteSnapMode, number> = {
  '5min': MINUTE_STEP,
  '1min': 1,
};

function normalize(value: number, modulo: number): number {
  return ((value % modulo) + modulo) % modulo;
}

export function angleTo5MinStep(angleDeg: number): number {
  const steps = Math.round(normalize(angleDeg, 360) / 30);
  return (steps % 12) * 5;
}

export function angleToMinute(angleDeg: number, minuteStep = MINUTE_STEP): number {
  const normalizedStep = Math.max(1, minuteStep);
  const minute = Math.round(normalize(angleDeg, 360) / 6);
  const snappedMinute = Math.round(minute / normalizedStep) * normalizedStep;
  return normalize(snappedMinute, 60);
}

export function angleToHour(angleDeg: number): number {
  const rounded = Math.round(normalize(angleDeg, 360) / 30) % 12;
  return rounded === 0 ? 12 : rounded;
}

function toCycleMinutes(hours: number, minutes: number): number {
  const normalizedHours = normalize(hours, 12);
  const normalizedMinutes = normalize(minutes, 60);
  return normalize(normalizedHours * 60 + normalizedMinutes, CLOCK_MINUTES_IN_CYCLE);
}

export function cycleMinutesToDisplayHour(cycleMinutes: number): number {
  const hours = Math.floor(normalize(cycleMinutes, CLOCK_MINUTES_IN_CYCLE) / 60) % 12;
  return hours === 0 ? 12 : hours;
}

export function cycleMinutesToDisplayMinutes(cycleMinutes: number): number {
  return normalize(cycleMinutes, 60);
}

export function cycleMinutesToHourAngle(cycleMinutes: number): number {
  return (normalize(cycleMinutes, CLOCK_MINUTES_IN_CYCLE) / 60) * 30;
}

export function cycleMinutesToMinuteAngle(cycleMinutes: number): number {
  return cycleMinutesToDisplayMinutes(cycleMinutes) * 6;
}

export function applyMinuteStepToCycleMinutes(cycleMinutes: number, nextMinute: number): number {
  return applyMinuteValueToCycleMinutes(cycleMinutes, nextMinute, MINUTE_STEP);
}

export function applyMinuteValueToCycleMinutes(
  cycleMinutes: number,
  nextMinute: number,
  minuteStep = MINUTE_STEP
): number {
  const normalizedCycleMinutes = normalize(cycleMinutes, CLOCK_MINUTES_IN_CYCLE);
  const normalizedStep = Math.max(1, minuteStep);
  const minuteTicks = Math.round(60 / normalizedStep);
  const previousMinute = normalizedCycleMinutes % 60;
  const previousTick = Math.round(previousMinute / normalizedStep) % minuteTicks;
  const nextTick = Math.round(normalize(nextMinute, 60) / normalizedStep) % minuteTicks;

  let deltaTicks = nextTick - previousTick;
  if (deltaTicks > minuteTicks / 2) {
    deltaTicks -= minuteTicks;
  } else if (deltaTicks < -(minuteTicks / 2)) {
    deltaTicks += minuteTicks;
  }

  return normalize(normalizedCycleMinutes + deltaTicks * normalizedStep, CLOCK_MINUTES_IN_CYCLE);
}

export function applyMinuteAngleToCycleMinutes(
  cycleMinutes: number,
  minuteAngle: number,
  minuteStep = MINUTE_STEP
): number {
  return applyMinuteValueToCycleMinutes(
    cycleMinutes,
    angleToMinute(minuteAngle, minuteStep),
    minuteStep
  );
}

export function applyHourAngleToCycleMinutes(cycleMinutes: number, hourAngle: number): number {
  const nextHour = angleToHour(hourAngle) % 12;
  const minutes = cycleMinutesToDisplayMinutes(cycleMinutes);
  return toCycleMinutes(nextHour, minutes);
}

export function getClockDistanceInMinutes(
  actualHours: number,
  actualMinutes: number,
  expectedHours: number,
  expectedMinutes: number
): number {
  const actual = toCycleMinutes(actualHours, actualMinutes);
  const expected = toCycleMinutes(expectedHours, expectedMinutes);
  const distance = Math.abs(actual - expected);
  return Math.min(distance, CLOCK_MINUTES_IN_CYCLE - distance);
}

export function getMinuteRingDistance(actualMinutes: number, expectedMinutes: number): number {
  const distance = Math.abs(normalize(actualMinutes, 60) - normalize(expectedMinutes, 60));
  return Math.min(distance, 60 - distance);
}

export function buildClockWrongFeedback(
  actualHours: number,
  actualMinutes: number,
  expectedHours: number,
  expectedMinutes: number
): ClockFeedback {
  const totalMinuteDistance = getClockDistanceInMinutes(
    actualHours,
    actualMinutes,
    expectedHours,
    expectedMinutes
  );
  const minuteRingDistance = getMinuteRingDistance(actualMinutes, expectedMinutes);

  let title = 'Spróbuj jeszcze raz!';
  let tone: 'near' | 'far' = 'far';
  if (totalMinuteDistance <= 5) {
    title = 'Bardzo blisko!';
    tone = 'near';
  } else if (totalMinuteDistance <= 15) {
    title = 'Prawie!';
    tone = 'near';
  }

  let hint = 'Sprawdź obie wskazówki.';
  if (minuteRingDistance <= 5) {
    hint = 'Długa wskazówka jest prawie dobrze. Dopracuj krótką wskazówkę (godziny).';
  } else if (minuteRingDistance <= 15) {
    hint = 'Skup się na długiej wskazówce (minuty).';
  }

  return {
    kind: 'wrong',
    title,
    tone,
    details: `Twoja odpowiedź: ${actualHours}:${pad(actualMinutes)}. Poprawna: ${expectedHours}:${pad(expectedMinutes)}. Różnica: ${totalMinuteDistance} min. ${hint}`,
  };
}

export function taskToKey(task: ClockTask): string {
  return `${task.hours}:${task.minutes}`;
}

export function buildClockTaskPrompt(task: ClockTask): string {
  if (task.minutes === 0) {
    return 'Pełna godzina (minuty = 00).';
  }
  if (task.minutes === 15) {
    return `Kwadrans po ${task.hours}.`;
  }
  if (task.minutes === 30) {
    return `Wpół do ${task.hours === 12 ? 1 : task.hours + 1}.`;
  }
  if (task.minutes === 45) {
    return `Kwadrans do ${task.hours === 12 ? 1 : task.hours + 1}.`;
  }
  return 'Wskazówka godzin przesuwa się razem z minutami.';
}

export function scheduleRetryTask(
  tasks: ClockTask[],
  retryCounts: Record<string, number>,
  task: ClockTask,
  options: { maxRetriesPerTask?: number; maxTasks?: number } = {}
): {
  tasks: ClockTask[];
  retryCounts: Record<string, number>;
  added: boolean;
} {
  const maxRetriesPerTask = options.maxRetriesPerTask ?? 1;
  const maxTasks = options.maxTasks ?? 8;
  const key = taskToKey(task);
  const usedRetries = retryCounts[key] ?? 0;
  if (usedRetries >= maxRetriesPerTask || tasks.length >= maxTasks) {
    return {
      tasks,
      retryCounts,
      added: false,
    };
  }

  return {
    tasks: [...tasks, task],
    retryCounts: {
      ...retryCounts,
      [key]: usedRetries + 1,
    },
    added: true,
  };
}

function DraggableClock({
  onSubmit,
  showChallengeRing = false,
  challengeTimeLeft = CHALLENGE_TIME_LIMIT_SECONDS,
  challengeTimeLimit = CHALLENGE_TIME_LIMIT_SECONDS,
}: DraggableClockProps): React.JSX.Element {
  const [cycleMinutes, setCycleMinutes] = useState(0);
  const [minuteSnapMode, setMinuteSnapMode] = useState<MinuteSnapMode>('5min');
  const [activeHand, setActiveHand] = useState<Hand | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef<Hand | null>(null);
  const minuteStep = MINUTE_STEP_BY_MODE[minuteSnapMode];

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

  return (
    <div className='flex flex-col items-center gap-4'>
      <p className='text-sm text-gray-400'>Przeciągnij wskazówki, aby ustawić godzinę:</p>
      <p
        data-testid='clock-time-display'
        className='text-2xl font-extrabold text-indigo-700 bg-indigo-50 px-5 py-2 rounded-2xl'
      >
        {displayHour}:{pad(displayMinutes)}
      </p>
      <div className='inline-flex items-center gap-2 rounded-[26px] border border-white/75 bg-white/86 p-1.5 shadow-[0_14px_34px_-26px_rgba(79,70,229,0.35)]'>
        <KangurButton
          type='button'
          data-testid='clock-snap-mode-5'
          onClick={() => setMinuteSnapMode('5min')}
          className='h-10 px-3.5 text-xs'
          size='sm'
          variant={minuteSnapMode === '5min' ? 'surface' : 'secondary'}
        >
          Skok co 5 min
        </KangurButton>
        <KangurButton
          type='button'
          data-testid='clock-snap-mode-1'
          onClick={() => setMinuteSnapMode('1min')}
          className='h-10 px-3.5 text-xs'
          size='sm'
          variant={minuteSnapMode === '1min' ? 'surface' : 'secondary'}
        >
          Dokładnie co 1 min
        </KangurButton>
      </div>
      <p className='text-xs text-gray-500'>
        {activeHand === 'hour'
          ? 'Przestawiasz krótką wskazówkę (godziny).'
          : activeHand === 'minute'
            ? 'Przestawiasz długą wskazówkę (minuty).'
            : 'Wskazówka godzin przesuwa się płynnie razem z minutami.'}
      </p>

      <svg
        ref={svgRef}
        viewBox='0 0 200 200'
        width='220'
        height='220'
        className='drop-shadow-lg touch-none select-none'
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
        <circle cx='100' cy='100' r='95' fill='white' stroke='#6366f1' strokeWidth='4' />

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
          data-testid='clock-hour-hand'
          x1='100'
          y1='100'
          x2={hourHandX}
          y2={hourHandY}
          stroke='#dc2626'
          strokeWidth={activeHand === 'hour' ? '9' : '7'}
          strokeLinecap='round'
          style={{ cursor: activeHand === 'hour' ? 'grabbing' : 'grab' }}
          onMouseDown={onMouseDown('hour')}
          onTouchStart={onMouseDown('hour')}
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
          style={{ cursor: activeHand === 'minute' ? 'grabbing' : 'grab' }}
          onMouseDown={onMouseDown('minute')}
          onTouchStart={onMouseDown('minute')}
        />

        <circle
          cx={hourHandX}
          cy={hourHandY}
          r={activeHand === 'hour' ? '12' : '10'}
          fill='#dc2626'
          fillOpacity='0.25'
          style={{ cursor: activeHand === 'hour' ? 'grabbing' : 'grab' }}
          onMouseDown={onMouseDown('hour')}
          onTouchStart={onMouseDown('hour')}
        />
        <circle
          cx={minuteHandX}
          cy={minuteHandY}
          r={activeHand === 'minute' ? '12' : '10'}
          fill='#16a34a'
          fillOpacity='0.25'
          style={{ cursor: activeHand === 'minute' ? 'grabbing' : 'grab' }}
          onMouseDown={onMouseDown('minute')}
          onTouchStart={onMouseDown('minute')}
        />
        <circle cx='100' cy='100' r='5' fill='#6366f1' />
      </svg>

      <div className='flex gap-3 text-sm text-gray-500'>
        <span className='flex items-center gap-1'>
          <span className='w-3 h-3 rounded-full bg-red-500 inline-block' /> Godziny (krótka)
        </span>
        <span className='flex items-center gap-1'>
          <span className='w-3 h-3 rounded-full bg-green-600 inline-block' /> Minuty (długa)
        </span>
      </div>

      <KangurButton onClick={() => onSubmit(displayHour, displayMinutes)} size='xl' variant='primary'>
        Sprawdź! ✅
      </KangurButton>
    </div>
  );
}

export default function ClockTrainingGame({ onFinish }: ClockTrainingGameProps): React.JSX.Element {
  const [gameMode, setGameMode] = useState<ClockGameMode>('practice');
  const [tasks, setTasks] = useState<ClockTask[]>(() => createClockTaskSet());
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<ClockFeedback | null>(null);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [retryCounts, setRetryCounts] = useState<Record<string, number>>({});
  const [retryAddedCount, setRetryAddedCount] = useState(0);
  const [challengeTimeLeft, setChallengeTimeLeft] = useState(CHALLENGE_TIME_LIMIT_SECONDS);
  const [challengeStreak, setChallengeStreak] = useState(0);
  const [challengeBestStreak, setChallengeBestStreak] = useState(0);

  const task = tasks[current];
  if (!task) {
    return <div className='text-sm text-gray-500'>Brak zadania.</div>;
  }

  const handleDone = useCallback(
    (finalScore: number): void => {
      const isPerfect = finalScore === tasks.length;
      const isGood = finalScore >= 3;
      const xp = isPerfect
        ? XP_REWARDS.clock_training_perfect
        : isGood
          ? XP_REWARDS.clock_training_good
          : 10;

      const progress = loadProgress();
      addXp(xp, {
        clockPerfect: isPerfect ? progress.clockPerfect + 1 : progress.clockPerfect,
        lessonMastery: buildLessonMasteryUpdate(
          progress,
          'clock',
          (finalScore / tasks.length) * 100
        ),
      });

      setXpEarned(xp);
      setDone(true);
    },
    [tasks.length]
  );

  const resetSession = useCallback(
    (mode: ClockGameMode = gameMode): void => {
      setGameMode(mode);
      setTasks(createClockTaskSet());
      setCurrent(0);
      setScore(0);
      setFeedback(null);
      setDone(false);
      setXpEarned(0);
      setRetryCounts({});
      setRetryAddedCount(0);
      setChallengeTimeLeft(CHALLENGE_TIME_LIMIT_SECONDS);
      setChallengeStreak(0);
      setChallengeBestStreak(0);
    },
    [gameMode]
  );

  const resolveAttempt = useCallback(
    ({
      correct,
      actualHours,
      actualMinutes,
      expectedTask,
      feedbackOverride,
    }: {
      correct: boolean;
      actualHours: number;
      actualMinutes: number;
      expectedTask: ClockTask;
      feedbackOverride?: ClockFeedback;
    }): void => {
      const scoreAfterAttempt = correct ? score + 1 : score;
      let nextTaskCount = tasks.length;

      if (correct) {
        setScore((prevScore) => prevScore + 1);
        if (gameMode === 'challenge') {
          const nextStreak = challengeStreak + 1;
          setChallengeStreak(nextStreak);
          setChallengeBestStreak((value) => Math.max(value, nextStreak));
        }
        setFeedback(
          feedbackOverride ?? {
            kind: 'correct',
            title: 'Brawo! Dobrze!',
            details:
              gameMode === 'challenge'
                ? `Ustawiłeś/aś poprawnie: ${expectedTask.hours}:${pad(expectedTask.minutes)}. Seria: ${challengeStreak + 1}.`
                : `Ustawiłeś/aś poprawnie: ${expectedTask.hours}:${pad(expectedTask.minutes)}.`,
          }
        );
      } else {
        if (gameMode === 'challenge') {
          setChallengeStreak(0);
        }

        let selectedFeedback =
          feedbackOverride ??
          buildClockWrongFeedback(
            actualHours,
            actualMinutes,
            expectedTask.hours,
            expectedTask.minutes
          );

        if (gameMode === 'practice') {
          const retryPlan = scheduleRetryTask(tasks, retryCounts, expectedTask);
          nextTaskCount = retryPlan.tasks.length;
          if (retryPlan.added) {
            setTasks(retryPlan.tasks);
            setRetryCounts(retryPlan.retryCounts);
            setRetryAddedCount((value) => value + 1);
            selectedFeedback = {
              ...selectedFeedback,
              details: `${selectedFeedback.details} Dodaliśmy krótką powtórkę tego zadania.`,
            };
          }
        }

        setFeedback(selectedFeedback);
      }

      const feedbackDelay = correct ? 1200 : gameMode === 'challenge' ? 1400 : 2100;
      setTimeout(() => {
        setFeedback(null);
        if (current + 1 >= nextTaskCount) {
          handleDone(scoreAfterAttempt);
        } else {
          setCurrent((prev) => prev + 1);
          if (gameMode === 'challenge') {
            setChallengeTimeLeft(CHALLENGE_TIME_LIMIT_SECONDS);
          }
        }
      }, feedbackDelay);
    },
    [challengeStreak, current, gameMode, handleDone, retryCounts, score, tasks]
  );

  const handleSubmit = (hours: number, minutes: number): void => {
    const correct = hours === task.hours && minutes === task.minutes;
    resolveAttempt({
      correct,
      actualHours: hours,
      actualMinutes: minutes,
      expectedTask: task,
    });
  };

  useEffect(() => {
    if (gameMode !== 'challenge' || done || feedback) {
      return;
    }
    if (challengeTimeLeft <= 0) {
      resolveAttempt({
        correct: false,
        actualHours: task.hours,
        actualMinutes: task.minutes,
        expectedTask: task,
        feedbackOverride: {
          kind: 'wrong',
          title: 'Czas minął!',
          tone: 'far',
          details: `Nie zdążyłeś/aś ustawić czasu. Poprawna godzina: ${task.hours}:${pad(task.minutes)}.`,
        },
      });
      return;
    }

    const timerId = window.setTimeout(() => {
      setChallengeTimeLeft((value) => Math.max(0, value - 1));
    }, 1000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [challengeTimeLeft, done, feedback, gameMode, resolveAttempt, task]);

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='py-4'
      >
        <KangurPanel
          className='flex flex-col items-center gap-5 text-center'
          padding='xl'
          variant='elevated'
        >
          <div className='text-6xl'>{score >= 4 ? '🏆' : score >= 2 ? '😊' : '💪'}</div>
          <h3 className='text-2xl font-extrabold text-indigo-700'>
            Wynik: {score}/{tasks.length}
          </h3>
          <p className='text-xs font-semibold text-indigo-600'>
            Tryb: {gameMode === 'challenge' ? 'Wyzwanie' : 'Nauka'}
          </p>
          {gameMode === 'challenge' && (
            <p data-testid='clock-challenge-summary' className='text-xs font-semibold text-amber-600'>
              Najlepsza seria: {challengeBestStreak}
            </p>
          )}
          {gameMode === 'practice' && retryAddedCount > 0 && (
            <p className='text-xs font-semibold text-indigo-600'>
              Powtórki adaptacyjne: {retryAddedCount}
            </p>
          )}
          {xpEarned > 0 && (
            <div className='bg-indigo-100 text-indigo-700 font-bold px-4 py-2 rounded-full text-sm'>
              +{xpEarned} XP ✨
            </div>
          )}
          <p className='text-gray-500 text-center max-w-xs'>
            {score === tasks.length
              ? 'Idealnie! Świetnie znasz zegar!'
              : 'Ćwicz dalej, a będziesz mistrzem zegara!'}
          </p>
          <div className='flex gap-3'>
            <KangurButton onClick={() => resetSession(gameMode)} size='lg' variant='secondary'>
              <RefreshCw className='w-4 h-4' /> Jeszcze raz
            </KangurButton>
            <KangurButton onClick={onFinish} size='lg' variant='primary'>
              Zakończ lekcję ✅
            </KangurButton>
          </div>
        </KangurPanel>
      </motion.div>
    );
  }

  return (
    <div className='flex flex-col items-center gap-4 w-full'>
      <div
        data-testid='clock-mode-switch'
        className='inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/85 p-1.5 shadow-sm'
      >
        <KangurButton
          data-testid='clock-mode-practice'
          onClick={() => resetSession('practice')}
          size='sm'
          variant={gameMode === 'practice' ? 'primary' : 'secondary'}
        >
          Tryb Nauka
        </KangurButton>
        <KangurButton
          data-testid='clock-mode-challenge'
          onClick={() => resetSession('challenge')}
          size='sm'
          variant={gameMode === 'challenge' ? 'warning' : 'secondary'}
        >
          Tryb Wyzwanie
        </KangurButton>
      </div>
      {gameMode === 'challenge' ? (
        <div className='inline-flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700'>
          <span data-testid='clock-challenge-timer'>⏱ {challengeTimeLeft}s</span>
          <span data-testid='clock-challenge-streak'>🔥 Seria: {challengeStreak}</span>
        </div>
      ) : retryAddedCount > 0 ? (
        <p className='text-xs font-semibold text-indigo-600'>
          Powtórki adaptacyjne: {retryAddedCount}
        </p>
      ) : null}

      <div className='flex gap-2 mb-1'>
        {tasks.map((_, idx) => (
          <div
            key={idx}
            className={`w-3 h-3 rounded-full transition-all ${idx < current ? 'bg-indigo-400' : idx === current ? 'bg-indigo-600 scale-125' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      <div className='bg-amber-50 border border-amber-200 rounded-2xl px-6 py-3 text-center'>
        <p className='text-gray-500 text-sm mb-1'>Ustaw zegar na godzinę:</p>
        <p className='text-3xl font-extrabold text-amber-700'>
          {task.hours}:{pad(task.minutes)}
        </p>
        <p data-testid='clock-task-prompt' className='text-xs font-semibold text-amber-700/80 mt-1'>
          {buildClockTaskPrompt(task)}
        </p>
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            data-testid='clock-feedback'
            className={`flex flex-col items-start gap-1 px-5 py-3 rounded-2xl font-bold text-lg w-full max-w-xl ${
              feedback.kind === 'correct'
                ? 'bg-green-100 text-green-700'
                : feedback.tone === 'near'
                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                  : 'bg-red-100 text-red-700'
            }`}
          >
            {feedback.kind === 'correct' ? (
              <div className='flex items-center gap-2'>
                <CheckCircle className='w-5 h-5' /> {feedback.title}
              </div>
            ) : (
              <div className='flex items-center gap-2'>
                <XCircle className='w-5 h-5' /> {feedback.title}
              </div>
            )}
            <p className='text-sm font-semibold leading-relaxed'>{feedback.details}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {!feedback && (
        <DraggableClock
          onSubmit={handleSubmit}
          showChallengeRing={gameMode === 'challenge'}
          challengeTimeLeft={challengeTimeLeft}
          challengeTimeLimit={CHALLENGE_TIME_LIMIT_SECONDS}
        />
      )}
    </div>
  );
}
