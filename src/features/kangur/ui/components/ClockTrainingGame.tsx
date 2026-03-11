// @ts-nocheck
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import KangurRewardBreakdownChips from '@/features/kangur/ui/components/KangurRewardBreakdownChips';
import {
  KangurAccentDot,
  KangurButton,
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurInfoCard,
  KangurInlineFallback,
  KangurStatusChip,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PENDING_STEP_PILL_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
  KANGUR_STEP_PILL_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import {
  addXp,
  createTrainingReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';

type ClockTrainingGameProps = {
  completionPrimaryActionLabel?: string;
  enableAdaptiveRetry?: boolean;
  hideModeSwitch?: boolean;
  initialMode?: ClockGameMode;
  onCompletionPrimaryAction?: () => void;
  onFinish: () => void;
  onPracticeCompleted?: (result: { correctCount: number; totalCount: number }) => void;
  onPracticeSuccess?: () => void;
  onModeChange?: (mode: ClockGameMode) => void;
  onChallengeSuccess?: (result: ClockChallengeResult) => void;
  practiceTasks?: ClockTask[];
  section?: ClockTrainingTaskPoolId;
  showTaskTitle?: boolean;
  showTimeDisplay?: boolean;
};

type ClockTask = {
  hours: number;
  minutes: number;
};

type Feedback = 'correct' | 'wrong' | null;
type Hand = 'hour' | 'minute';
type MinuteSnapMode = '5min' | '1min';
export type ClockGameMode = 'practice' | 'challenge';
export type ClockTrainingSectionId = 'hours' | 'minutes' | 'combined';
export type ClockTrainingTaskPoolId = ClockTrainingSectionId | 'mixed';
export type ClockChallengeMedal = 'gold' | 'silver' | 'bronze';

type ClockChallengeResult = {
  correctCount: number;
  medal: ClockChallengeMedal;
  totalCount: number;
};

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
  section?: ClockTrainingTaskPoolId;
  showTimeDisplay?: boolean;
  submitFeedback?: Feedback;
  submitFeedbackDetails?: string | null;
  submitFeedbackTitle?: string | null;
  submitNextStep?: 'next-stage' | 'next-task' | 'summary' | null;
  submitLocked?: boolean;
};

type ClockTrainingSectionContent = {
  accent: 'amber' | 'emerald' | 'indigo' | 'rose';
  guidance: string;
  guidanceTitle: string;
  legend: string;
  promptLabel: string;
};

export const CLOCK_TRAINING_TASKS: Record<ClockTrainingTaskPoolId, ClockTask[]> = {
  mixed: [
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
  ],
  hours: [
    { hours: 1, minutes: 0 },
    { hours: 3, minutes: 0 },
    { hours: 4, minutes: 0 },
    { hours: 6, minutes: 0 },
    { hours: 7, minutes: 0 },
    { hours: 9, minutes: 0 },
    { hours: 11, minutes: 0 },
    { hours: 12, minutes: 0 },
  ],
  minutes: [
    { hours: 12, minutes: 5 },
    { hours: 12, minutes: 10 },
    { hours: 12, minutes: 15 },
    { hours: 12, minutes: 20 },
    { hours: 12, minutes: 25 },
    { hours: 12, minutes: 30 },
    { hours: 12, minutes: 35 },
    { hours: 12, minutes: 40 },
    { hours: 12, minutes: 45 },
    { hours: 12, minutes: 50 },
    { hours: 12, minutes: 55 },
  ],
  combined: [
    { hours: 1, minutes: 15 },
    { hours: 2, minutes: 50 },
    { hours: 4, minutes: 20 },
    { hours: 5, minutes: 45 },
    { hours: 7, minutes: 30 },
    { hours: 8, minutes: 10 },
    { hours: 9, minutes: 35 },
    { hours: 10, minutes: 25 },
    { hours: 11, minutes: 40 },
    { hours: 12, minutes: 5 },
  ],
};

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

export function getClockTrainingSectionLabel(section: ClockTrainingTaskPoolId): string {
  switch (section) {
    case 'hours':
      return 'Godziny';
    case 'minutes':
      return 'Minuty';
    case 'combined':
      return 'Pełny czas';
    default:
      return 'Mieszane';
  }
}

export function getClockTrainingSectionContent(
  section: ClockTrainingTaskPoolId
): ClockTrainingSectionContent {
  switch (section) {
    case 'hours':
      return {
        accent: 'rose',
        guidance: 'Skup się na krótkiej wskazówce. Długa wskazówka zostaje na 12, więc ustawiasz tylko pełne godziny.',
        guidanceTitle: 'Trening godzin',
        legend: 'Przesuwasz tylko krótką wskazówkę. Minuty są zablokowane na :00.',
        promptLabel: 'Ustaw pełną godzinę',
      };
    case 'minutes':
      return {
        accent: 'emerald',
        guidance: 'Skup się na długiej wskazówce. Krótka wskazówka stoi na 12, więc liczysz tylko minuty.',
        guidanceTitle: 'Trening minut',
        legend: 'Przesuwasz tylko długą wskazówkę. Godzina zostaje ustawiona na 12.',
        promptLabel: 'Ustaw minuty na tarczy',
      };
    case 'combined':
      return {
        accent: 'indigo',
        guidance: 'Najpierw ustaw godzinę krótką wskazówką, potem dopracuj minuty długą wskazówką.',
        guidanceTitle: 'Pełny odczyt czasu',
        legend: 'Ćwiczysz oba ruchy naraz: godziny i minuty.',
        promptLabel: 'Ustaw pełny czas',
      };
    default:
      return {
        accent: 'amber',
        guidance: 'Raz ćwiczysz pełne godziny, raz minuty, a raz cały odczyt czasu. Korzystaj z obu wskazówek.',
        guidanceTitle: 'Mieszany trening zegara',
        legend: 'Łącz krótką i długą wskazówkę zależnie od zadania.',
        promptLabel: 'Ustaw zegar na godzinę',
      };
  }
}

function createClockTaskSet(section: ClockTrainingTaskPoolId): ClockTask[] {
  return shuffle(CLOCK_TRAINING_TASKS[section]).slice(0, INITIAL_TASK_COUNT);
}

function resolveClockPracticeTaskSet(
  section: ClockTrainingTaskPoolId,
  practiceTasks?: ClockTask[]
): ClockTask[] {
  if (practiceTasks && practiceTasks.length > 0) {
    return practiceTasks;
  }

  return createClockTaskSet(section);
}

function resolveClockChallengeMedal(
  correctCount: number,
  totalCount: number
): ClockChallengeMedal {
  if (correctCount >= totalCount) {
    return 'gold';
  }
  if (correctCount >= Math.max(1, totalCount - 1)) {
    return 'silver';
  }
  return 'bronze';
}

function getClockChallengeMedalLabel(medal: ClockChallengeMedal): string {
  switch (medal) {
    case 'gold':
      return 'Złoty medal';
    case 'silver':
      return 'Srebrny medal';
    case 'bronze':
      return 'Brązowy medal';
    default:
      return 'Medal';
  }
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
  expectedMinutes: number,
  section: ClockTrainingTaskPoolId = 'mixed'
): ClockFeedback {
  const totalMinuteDistance = getClockDistanceInMinutes(
    actualHours,
    actualMinutes,
    expectedHours,
    expectedMinutes
  );
  const minuteRingDistance = getMinuteRingDistance(actualMinutes, expectedMinutes);

  if (section === 'hours') {
    const hourDistance = Math.max(1, Math.round(totalMinuteDistance / 60));
    const title =
      hourDistance === 1
        ? 'Prawie! To sąsiednia godzina.'
        : hourDistance <= 2
          ? 'Blisko!'
          : 'Spróbuj jeszcze raz!';
    const hint =
      actualMinutes !== 0
        ? 'W treningu godzin dłuższa wskazówka zostaje na 12, więc minuty powinny być równe :00.'
        : 'Sprawdź pozycję krótkiej wskazówki i wybierz pełną godzinę.';

    return {
      kind: 'wrong',
      title,
      tone: hourDistance === 1 ? 'near' : 'far',
      details: `Twoja odpowiedź: ${actualHours}:${pad(actualMinutes)}. Poprawna: ${expectedHours}:${pad(expectedMinutes)}. Pomyłka o ${hourDistance} godz. ${hint}`,
    };
  }

  let title = 'Spróbuj jeszcze raz!';
  let tone: 'near' | 'far' = 'far';
  if (totalMinuteDistance < 5) {
    title = section === 'minutes' ? 'Bardzo blisko z minutami!' : 'Bardzo blisko!';
    tone = 'near';
  } else if (totalMinuteDistance <= 15) {
    title = section === 'minutes' ? 'Prawie! Minuty są blisko.' : 'Prawie!';
  }

  let hint = 'Sprawdź obie wskazówki.';
  if (section === 'minutes') {
    if (minuteRingDistance <= 5) {
      hint = 'Długa wskazówka jest prawie dobrze. Przesuń ją jeszcze o jedną kreskę.';
    } else if (minuteRingDistance <= 15) {
      hint = 'Policz kreski po 5 minut i popraw długą wskazówkę.';
    } else {
      hint = 'Skup się tylko na długiej wskazówce. Krótka zostaje na 12.';
    }
  } else if (minuteRingDistance <= 5) {
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

export function buildClockTaskPrompt(
  task: ClockTask,
  section: ClockTrainingTaskPoolId = 'mixed'
): string {
  if (section === 'hours') {
    return 'Pełna godzina. Ustaw krótką wskazówkę, a minuty zostają na 00.';
  }
  if (section === 'minutes') {
    if (task.minutes === 15) {
      return 'Kwadrans. Krótka wskazówka zostaje na 12.';
    }
    if (task.minutes === 30) {
      return 'Pół godziny. Krótka wskazówka zostaje na 12.';
    }
    if (task.minutes === 45) {
      return '45 minut. Krótka wskazówka zostaje na 12.';
    }
    return 'Skup się na długiej wskazówce. Krótka wskazówka zostaje na 12.';
  }
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

export function buildClockCorrectFeedback(
  section: ClockTrainingTaskPoolId,
  task: ClockTask,
  options: { gameMode?: ClockGameMode; streak?: number } = {}
): ClockFeedback {
  const gameMode = options.gameMode ?? 'practice';
  const streak = options.streak ?? 0;
  const time = `${task.hours}:${pad(task.minutes)}`;

  let title = 'Brawo! Dobrze!';
  let details = `Ustawiłeś/aś poprawnie: ${time}.`;

  if (section === 'hours') {
    title = 'Brawo! To dobra godzina!';
    details = `Ustawiłeś/aś poprawną pełną godzinę: ${time}.`;
  } else if (section === 'minutes') {
    title = 'Brawo! Minuty się zgadzają!';
    details = `Ustawiłeś/aś poprawne minuty: ${time}.`;
  } else if (section === 'combined') {
    title = 'Brawo! Pełny czas ustawiony!';
    details = `Ustawiłeś/aś poprawny pełny czas: ${time}.`;
  }

  if (gameMode === 'challenge') {
    details = `${details} Seria: ${streak}.`;
  }

  return {
    kind: 'correct',
    title,
    details,
  };
}

export function buildClockTimeoutFeedback(
  section: ClockTrainingTaskPoolId,
  task: ClockTask
): ClockFeedback {
  const time = `${task.hours}:${pad(task.minutes)}`;

  if (section === 'hours') {
    return {
      kind: 'wrong',
      title: 'Czas minął!',
      tone: 'far',
      details: `Nie zdążyłeś/aś ustawić pełnej godziny. Poprawna godzina: ${time}.`,
    };
  }

  if (section === 'minutes') {
    return {
      kind: 'wrong',
      title: 'Czas minął!',
      tone: 'far',
      details: `Nie zdążyłeś/aś ustawić minut. Poprawny odczyt: ${time}.`,
    };
  }

  if (section === 'combined') {
    return {
      kind: 'wrong',
      title: 'Czas minął!',
      tone: 'far',
      details: `Nie zdążyłeś/aś ustawić pełnego czasu. Poprawna godzina: ${time}.`,
    };
  }

  return {
    kind: 'wrong',
    title: 'Czas minął!',
    tone: 'far',
    details: `Nie zdążyłeś/aś ustawić czasu. Poprawna godzina: ${time}.`,
  };
}

export function getClockTrainingSummaryMessage(
  section: ClockTrainingTaskPoolId,
  score: number,
  totalTasks: number
): string {
  const isPerfect = score === totalTasks;

  if (section === 'hours') {
    return isPerfect
      ? 'Świetnie! Pewnie odczytujesz pełne godziny.'
      : 'Poćwicz jeszcze pełne godziny i obserwuj krótką wskazówkę.';
  }

  if (section === 'minutes') {
    return isPerfect
      ? 'Świetnie! Długa wskazówka i minuty są już pod kontrolą.'
      : 'Poćwicz jeszcze minuty, licząc kreski po 5 wokół tarczy.';
  }

  if (section === 'combined') {
    return isPerfect
      ? 'Świetnie! Łączysz godziny i minuty w pełny odczyt czasu.'
      : 'Poćwicz jeszcze wspólne ustawianie godzin i minut.';
  }

  return isPerfect
    ? 'Idealnie! Świetnie znasz zegar!'
    : 'Ćwicz dalej, a będziesz mistrzem zegara!';
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
      <p
        className='text-xs [color:var(--kangur-page-muted-text)]'
        data-testid='clock-interaction-hint'
      >
        {activeHand === 'hour'
          ? 'Przestawiasz krótką wskazówkę (godziny).'
          : activeHand === 'minute'
            ? 'Przestawiasz długą wskazówkę (minuty).'
            : submitFeedback === 'correct'
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
                : section === 'hours'
                  ? 'Długa wskazówka jest zablokowana na 12.'
                  : section === 'minutes'
                    ? 'Krótka wskazówka jest zablokowana na 12.'
                    : 'Wskazówka godzin przesuwa się płynnie razem z minutami.'}
      </p>

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

      <div className='flex gap-3 text-sm [color:var(--kangur-page-muted-text)]'>
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
              'disabled:opacity-100',
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

export default function ClockTrainingGame({
  completionPrimaryActionLabel = 'Zakończ ćwiczenie ✅',
  enableAdaptiveRetry = true,
  hideModeSwitch = false,
  initialMode = 'practice',
  onCompletionPrimaryAction,
  onFinish,
  onPracticeCompleted,
  onPracticeSuccess,
  onModeChange,
  onChallengeSuccess,
  practiceTasks,
  section = 'mixed',
  showTaskTitle = true,
  showTimeDisplay = true,
}: ClockTrainingGameProps): React.JSX.Element {
  const [gameMode, setGameMode] = useState<ClockGameMode>(initialMode);
  const [tasks, setTasks] = useState<ClockTask[]>(() =>
    resolveClockPracticeTaskSet(section, practiceTasks)
  );
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<ClockFeedback | null>(null);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [submitNextStep, setSubmitNextStep] = useState<'next-stage' | 'next-task' | 'summary' | null>(
    null
  );
  const [retryCounts, setRetryCounts] = useState<Record<string, number>>({});
  const [retryAddedCount, setRetryAddedCount] = useState(0);
  const [challengeTimeLeft, setChallengeTimeLeft] = useState(CHALLENGE_TIME_LIMIT_SECONDS);
  const [challengeStreak, setChallengeStreak] = useState(0);
  const [challengeBestStreak, setChallengeBestStreak] = useState(0);
  const [challengeMedal, setChallengeMedal] = useState<ClockChallengeMedal | null>(null);
  const sessionStartedAtRef = useRef(Date.now());
  const advanceTimeoutRef = useRef<number | null>(null);
  const trainingSectionContent = getClockTrainingSectionContent(section);

  const task = tasks[current];
  if (!task) {
    return <KangurInlineFallback data-testid='clock-training-empty' title='Brak zadania.' />;
  }
  const currentTaskNumber = Math.min(current + 1, tasks.length);
  const showStandalonePracticeSummary = done && gameMode === 'practice' && !onPracticeCompleted;

  const handleDone = useCallback(
    (finalScore: number): void => {
      const progress = loadProgress();
      const reward = createTrainingReward(progress, {
        activityKey: `training:clock:${section}`,
        lessonKey: 'clock',
        correctAnswers: finalScore,
        totalQuestions: tasks.length,
        strongThresholdPercent: gameMode === 'challenge' ? 80 : 60,
        perfectCounterKey: 'clockPerfect',
      });
      addXp(reward.xp, reward.progressUpdates);
      void persistKangurSessionScore({
        operation: 'clock',
        score: finalScore,
        totalQuestions: tasks.length,
        correctAnswers: finalScore,
        timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
        xpEarned: reward.xp,
      });

      setXpEarned(reward.xp);
      setXpBreakdown(reward.breakdown ?? []);
      setDone(true);
      if (gameMode === 'challenge') {
        const medal = resolveClockChallengeMedal(finalScore, tasks.length);
        setChallengeMedal(medal);
        onChallengeSuccess?.({
          correctCount: finalScore,
          medal,
          totalCount: tasks.length,
        });
      } else {
        onPracticeCompleted?.({
          correctCount: finalScore,
          totalCount: tasks.length,
        });
      }
    },
    [gameMode, onChallengeSuccess, onPracticeCompleted, section, tasks.length]
  );

  const clearAdvanceTimeout = useCallback((): void => {
    if (advanceTimeoutRef.current !== null) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
  }, []);

  const resetSession = useCallback(
    (mode: ClockGameMode = gameMode): void => {
      clearAdvanceTimeout();
      onModeChange?.(mode);
      setGameMode(mode);
      setTasks(
        mode === 'challenge'
          ? createClockTaskSet(section)
          : resolveClockPracticeTaskSet(section, practiceTasks)
      );
      setCurrent(0);
      setScore(0);
      setFeedback(null);
      setDone(false);
      setXpEarned(0);
      setXpBreakdown([]);
      setSubmitNextStep(null);
      setRetryCounts({});
      setRetryAddedCount(0);
      setChallengeTimeLeft(CHALLENGE_TIME_LIMIT_SECONDS);
      setChallengeStreak(0);
      setChallengeBestStreak(0);
      setChallengeMedal(null);
      sessionStartedAtRef.current = Date.now();
    },
    [clearAdvanceTimeout, gameMode, onModeChange, practiceTasks, section]
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
        } else if (!onPracticeCompleted) {
          onPracticeSuccess?.();
        }
        setFeedback(
          feedbackOverride ??
            buildClockCorrectFeedback(section, expectedTask, {
              gameMode,
              streak: challengeStreak + 1,
            })
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
            expectedTask.minutes,
            section
          );

        if (gameMode === 'practice' && enableAdaptiveRetry) {
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
      const isLastTask = current + 1 >= nextTaskCount;
      setSubmitNextStep(
        isLastTask
          ? gameMode === 'challenge' || !onPracticeCompleted
            ? 'summary'
            : 'next-stage'
          : 'next-task'
      );
      clearAdvanceTimeout();
      advanceTimeoutRef.current = window.setTimeout(() => {
        if (isLastTask) {
          if (gameMode === 'challenge') {
            setFeedback(null);
          }
          setSubmitNextStep(null);
          advanceTimeoutRef.current = null;
          handleDone(scoreAfterAttempt);
          return;
        }

        setFeedback(null);
        setSubmitNextStep(null);
        setCurrent((prev) => prev + 1);
        if (gameMode === 'challenge') {
          setChallengeTimeLeft(CHALLENGE_TIME_LIMIT_SECONDS);
        }
        advanceTimeoutRef.current = null;
      }, feedbackDelay);
    },
    [
      challengeStreak,
      clearAdvanceTimeout,
      current,
      enableAdaptiveRetry,
      gameMode,
      handleDone,
      onPracticeCompleted,
      onPracticeSuccess,
      retryCounts,
      score,
      tasks,
    ]
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
          ...buildClockTimeoutFeedback(section, task),
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

  useEffect(() => () => clearAdvanceTimeout(), [clearAdvanceTimeout]);

  const completionAction = onCompletionPrimaryAction ?? onFinish;

  if (done && (gameMode === 'challenge' || showStandalonePracticeSummary)) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className='py-4'>
        <KangurGlassPanel
          className='flex flex-col items-center gap-5 text-center'
          data-testid='clock-training-summary-shell'
          padding='xl'
          surface='solid'
          variant='soft'
        >
          <KangurDisplayEmoji
            aria-hidden='true'
            data-testid='clock-training-summary-emoji'
            size='lg'
          >
            {score >= 4 ? '🏆' : score >= 2 ? '😊' : '💪'}
          </KangurDisplayEmoji>
          <h3 className='text-2xl font-extrabold text-indigo-700'>
            Wynik: {score}/{tasks.length}
          </h3>
          <p className='text-xs font-semibold text-indigo-600'>
            Tryb: {gameMode === 'challenge' ? 'Wyzwanie' : 'Nauka'}
          </p>
          {gameMode === 'challenge' && challengeMedal ? (
            <KangurStatusChip
              accent={
                challengeMedal === 'gold'
                  ? 'amber'
                  : challengeMedal === 'silver'
                    ? 'slate'
                    : 'rose'
              }
              className='px-4 py-2 text-sm font-bold'
              data-testid='clock-challenge-medal'
            >
              {getClockChallengeMedalLabel(challengeMedal)}
            </KangurStatusChip>
          ) : null}
          {gameMode === 'challenge' && (
            <p
              data-testid='clock-challenge-summary'
              className='text-xs font-semibold text-amber-600'
            >
              Najlepsza seria: {challengeBestStreak}
            </p>
          )}
          {gameMode === 'practice' && retryAddedCount > 0 && (
            <p className='text-xs font-semibold text-indigo-600'>
              Powtórki adaptacyjne: {retryAddedCount}
            </p>
          )}
          {xpEarned > 0 && (
            <KangurStatusChip accent='indigo' className='px-4 py-2 text-sm font-bold'>
              +{xpEarned} XP ✨
            </KangurStatusChip>
          )}
          <KangurRewardBreakdownChips
            accent='slate'
            breakdown={xpBreakdown}
            className='justify-center'
            dataTestId='clock-training-summary-breakdown'
            itemDataTestIdPrefix='clock-training-summary-breakdown'
          />
          <p className='max-w-xs text-center [color:var(--kangur-page-muted-text)]'>
            {getClockTrainingSummaryMessage(section, score, tasks.length)}
          </p>
          <div className='flex gap-3'>
            <KangurButton onClick={() => resetSession(gameMode)} size='lg' variant='surface'>
              <RefreshCw className='w-4 h-4' /> Jeszcze raz
            </KangurButton>
            <KangurButton onClick={completionAction} size='lg' variant='primary'>
              {completionPrimaryActionLabel}
            </KangurButton>
          </div>
        </KangurGlassPanel>
      </motion.div>
    );
  }
  const taskSummaryTitle = showTaskTitle ? `${task.hours}:${pad(task.minutes)}` : null;
  const activeSection = section;
  const timeDisplayEnabled = showTimeDisplay;

  return (
    <div className='flex flex-col items-center gap-4 w-full'>
      {!hideModeSwitch ? (
        <div
          data-testid='clock-mode-switch'
          className={cn(
            KANGUR_SEGMENTED_CONTROL_CLASSNAME,
            'inline-flex w-auto flex-wrap items-center justify-center'
          )}
        >
          <KangurButton
            data-testid='clock-mode-practice'
            onClick={() => resetSession('practice')}
            className='h-10 px-4 text-xs sm:flex-none'
            size='sm'
            variant={gameMode === 'practice' ? 'segmentActive' : 'segment'}
          >
            Tryb Nauka
          </KangurButton>
          <KangurButton
            data-testid='clock-mode-challenge'
            onClick={() => resetSession('challenge')}
            className='h-10 px-4 text-xs sm:flex-none'
            size='sm'
            variant={gameMode === 'challenge' ? 'segmentActive' : 'segment'}
          >
            Tryb Wyzwanie
          </KangurButton>
        </div>
      ) : null}
      {section !== 'mixed' && gameMode !== 'challenge' && (
        <KangurInfoCard
          accent={trainingSectionContent.accent}
          className='w-full max-w-md'
          data-testid='clock-training-guidance'
          padding='md'
          tone='accent'
        >
          <p
            className='text-sm font-semibold [color:var(--kangur-page-text)]'
            data-testid='clock-training-guidance-title'
          >
            {trainingSectionContent.guidanceTitle}
          </p>
          <p className='mt-2 text-sm font-normal leading-relaxed [color:var(--kangur-page-text)]'>
            {trainingSectionContent.guidance}
          </p>
          <p className='mt-2 text-xs font-normal [color:var(--kangur-page-muted-text)]'>
            {trainingSectionContent.legend}
          </p>
        </KangurInfoCard>
      )}
      {gameMode === 'challenge' ? (
        <div className='inline-flex flex-wrap items-center gap-2'>
          <KangurStatusChip
            accent='amber'
            className='text-xs font-bold uppercase tracking-[0.16em]'
            data-testid='clock-challenge-pill'
          >
            Wyzwanie
          </KangurStatusChip>
          <KangurStatusChip
            accent='amber'
            className='gap-2 text-xs font-bold'
            data-testid='clock-challenge-timer'
          >
            ⏱ {challengeTimeLeft}s
          </KangurStatusChip>
          <KangurStatusChip
            accent='amber'
            className='gap-2 text-xs font-bold'
            data-testid='clock-challenge-streak'
          >
            🔥 Seria {Math.min(current + 1, tasks.length)}/{tasks.length}
          </KangurStatusChip>
        </div>
      ) : (
        <div className='inline-flex flex-wrap items-center gap-2'>
          <KangurStatusChip
            accent='indigo'
            className='gap-2 text-xs font-bold'
            data-testid='clock-practice-series'
          >
            Seria {Math.min(current + 1, tasks.length)}/{tasks.length}
          </KangurStatusChip>
          {retryAddedCount > 0 ? (
            <KangurStatusChip
              accent='indigo'
              className='text-xs font-semibold'
              data-testid='clock-retry-count'
            >
              Powtórki adaptacyjne: {retryAddedCount}
            </KangurStatusChip>
          ) : null}
        </div>
      )}
      <div className='flex flex-col items-center gap-2' data-testid='clock-task-progress'>
        <p
          className='text-[11px] font-bold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'
          data-testid='clock-task-progress-label'
        >
          Zadanie {currentTaskNumber} z {tasks.length}
        </p>
        <div className='flex items-center gap-1.5' data-testid='clock-task-progress-pills'>
          {tasks.map((_, index) => {
            const isCompleted = index < current || (done && index === current);
            const isActive = !done && index === current;
            return (
              <span
                key={`${taskToKey(tasks[index]!)}-${index}`}
                className={cn(
                  KANGUR_STEP_PILL_CLASSNAME,
                  'h-[12px] min-w-[12px]',
                  isActive
                    ? [gameMode === 'challenge' ? 'w-7 bg-amber-500' : 'w-7 bg-indigo-500']
                    : isCompleted
                      ? [gameMode === 'challenge' ? 'w-4 bg-amber-200' : 'w-4 bg-indigo-200']
                      : KANGUR_PENDING_STEP_PILL_CLASSNAME
                )}
                data-testid={`clock-task-progress-pill-${index}`}
              />
            );
          })}
        </div>
      </div>

      <KangurSummaryPanel
        accent='amber'
        align='center'
        className='w-full max-w-md'
        label={trainingSectionContent.promptLabel}
        padding='md'
        title={taskSummaryTitle}
        tone='accent'
      >
        <p data-testid='clock-task-prompt' className='text-xs font-semibold text-amber-700/80 mt-1'>
          {buildClockTaskPrompt(task, section)}
        </p>
      </KangurSummaryPanel>

      <DraggableClock
        onSubmit={handleSubmit}
        showChallengeRing={gameMode === 'challenge'}
        challengeTimeLeft={challengeTimeLeft}
        challengeTimeLimit={CHALLENGE_TIME_LIMIT_SECONDS}
        section={activeSection}
        showTimeDisplay={timeDisplayEnabled}
        submitFeedback={feedback?.kind ?? (done && gameMode === 'practice' ? 'correct' : null)}
        submitFeedbackDetails={feedback?.details ?? null}
        submitFeedbackTitle={feedback?.title ?? null}
        submitNextStep={submitNextStep}
        submitLocked={feedback !== null || done}
      />
    </div>
  );
}
