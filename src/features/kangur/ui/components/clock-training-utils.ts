import { CLOCK_TRAINING_TASKS } from './clock-training-data';

export type ClockTask = {
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

export type ClockTrainingSectionContent = {
  accent: 'amber' | 'emerald' | 'indigo' | 'rose';
  guidance?: string;
  guidanceTitle?: string;
  legend?: string;
  promptLabel: string;
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

export { CHALLENGE_TIME_LIMIT_SECONDS, MINUTE_STEP_BY_MODE };
export type { ClockChallengeResult, ClockFeedback, Feedback, Hand, MinuteSnapMode };
export {
  createClockTaskSet,
  resolveClockChallengeMedal,
  resolveClockPracticeTaskSet,
  getClockChallengeMedalLabel,
  pad,
};
