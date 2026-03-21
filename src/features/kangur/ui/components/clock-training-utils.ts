import { CLOCK_TRAINING_TASKS } from './clock-training-data';
import {
  translateClockTrainingWithFallback,
  type ClockTrainingTranslate,
} from './clock-training-i18n';
import type {
  ClockChallengeMedal,
  ClockGameMode,
  ClockTask,
  ClockTrainingTaskPoolId,
} from './clock-training/types';

export type {
  ClockChallengeMedal,
  ClockChallengeResult,
  ClockGameMode,
  ClockTask,
  ClockTrainingSectionContent,
  ClockTrainingSectionId,
  ClockTrainingTaskPoolId,
} from './clock-training/types';

export type Feedback = 'correct' | 'wrong' | null;
export type Hand = 'hour' | 'minute';
export type MinuteSnapMode = '5min' | '1min';

export type ClockFeedback = {
  kind: Feedback;
  title: string;
  details: string;
  emoji: string;
  tone?: 'near' | 'far';
};

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

export function getClockTrainingSectionLabel(
  section: ClockTrainingTaskPoolId,
  translate?: ClockTrainingTranslate
): string {
  switch (section) {
    case 'hours':
      return translateClockTrainingWithFallback(translate, 'sections.hours', 'Godziny');
    case 'minutes':
      return translateClockTrainingWithFallback(translate, 'sections.minutes', 'Minuty');
    case 'combined':
      return translateClockTrainingWithFallback(translate, 'sections.combined', 'Pełny czas');
    default:
      return translateClockTrainingWithFallback(translate, 'sections.mixed', 'Mieszane');
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

function getClockChallengeMedalLabel(
  medal: ClockChallengeMedal,
  translate?: ClockTrainingTranslate
): string {
  switch (medal) {
    case 'gold':
      return translateClockTrainingWithFallback(translate, 'medals.gold', 'Złoty medal');
    case 'silver':
      return translateClockTrainingWithFallback(translate, 'medals.silver', 'Srebrny medal');
    case 'bronze':
      return translateClockTrainingWithFallback(translate, 'medals.bronze', 'Brązowy medal');
    default:
      return translateClockTrainingWithFallback(translate, 'medals.default', 'Medal');
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
  section: ClockTrainingTaskPoolId = 'mixed',
  translate?: ClockTrainingTranslate
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
        ? translateClockTrainingWithFallback(
            translate,
            'feedback.wrong.title.hours.neighbor',
            'Prawie! To sąsiednia godzina.'
          )
        : hourDistance <= 2
          ? translateClockTrainingWithFallback(
              translate,
              'feedback.wrong.title.hours.close',
              'Blisko!'
            )
          : translateClockTrainingWithFallback(
              translate,
              'feedback.wrong.title.default',
              'Spróbuj jeszcze raz!'
            );
    const hint =
      actualMinutes !== 0
        ? translateClockTrainingWithFallback(
            translate,
            'feedback.wrong.hint.hours.minutesStayZero',
            'W treningu godzin dłuższa wskazówka zostaje na 12, więc minuty powinny być równe :00.'
          )
        : translateClockTrainingWithFallback(
            translate,
            'feedback.wrong.hint.hours.checkShortHand',
            'Sprawdź pozycję krótkiej wskazówki i wybierz pełną godzinę.'
          );

    return {
      kind: 'wrong',
      title,
      tone: hourDistance === 1 ? 'near' : 'far',
      emoji: '❌',
      details: translateClockTrainingWithFallback(
        translate,
        'feedback.wrong.details.hours',
        `Twoja odpowiedź: ${actualHours}:${pad(actualMinutes)}. Poprawna: ${expectedHours}:${pad(expectedMinutes)}. Pomyłka o ${hourDistance} godz. ${hint}`,
        {
          actual: `${actualHours}:${pad(actualMinutes)}`,
          expected: `${expectedHours}:${pad(expectedMinutes)}`,
          distance: hourDistance,
          hint,
        }
      ),
    };
  }

  let title = translateClockTrainingWithFallback(
    translate,
    'feedback.wrong.title.default',
    'Spróbuj jeszcze raz!'
  );
  let tone: 'near' | 'far' = 'far';
  if (totalMinuteDistance < 5) {
    title =
      section === 'minutes'
        ? translateClockTrainingWithFallback(
            translate,
            'feedback.wrong.title.minutes.veryNear',
            'Bardzo blisko z minutami!'
          )
        : translateClockTrainingWithFallback(
            translate,
            'feedback.wrong.title.veryNear',
            'Bardzo blisko!'
          );
    tone = 'near';
  } else if (totalMinuteDistance <= 15) {
    title =
      section === 'minutes'
        ? translateClockTrainingWithFallback(
            translate,
            'feedback.wrong.title.minutes.near',
            'Prawie! Minuty są blisko.'
          )
        : translateClockTrainingWithFallback(
            translate,
            'feedback.wrong.title.near',
            'Prawie!'
          );
  }

  let hint = translateClockTrainingWithFallback(
    translate,
    'feedback.wrong.hint.default',
    'Sprawdź obie wskazówki.'
  );
  if (section === 'minutes') {
    if (minuteRingDistance <= 5) {
      hint = translateClockTrainingWithFallback(
        translate,
        'feedback.wrong.hint.minutes.moveOneTick',
        'Długa wskazówka jest prawie dobrze. Przesuń ją jeszcze o jedną kreskę.'
      );
    } else if (minuteRingDistance <= 15) {
      hint = translateClockTrainingWithFallback(
        translate,
        'feedback.wrong.hint.minutes.countByFives',
        'Policz kreski po 5 minut i popraw długą wskazówkę.'
      );
    } else {
      hint = translateClockTrainingWithFallback(
        translate,
        'feedback.wrong.hint.minutes.focusLongHand',
        'Skup się tylko na długiej wskazówce. Krótka zostaje na 12.'
      );
    }
  } else if (minuteRingDistance <= 5) {
    hint = translateClockTrainingWithFallback(
      translate,
      'feedback.wrong.hint.combined.adjustShortHand',
      'Długa wskazówka jest prawie dobrze. Dopracuj krótką wskazówkę (godziny).'
    );
  } else if (minuteRingDistance <= 15) {
    hint = translateClockTrainingWithFallback(
      translate,
      'feedback.wrong.hint.combined.focusLongHand',
      'Skup się na długiej wskazówce (minuty).'
    );
  }

  return {
    kind: 'wrong',
    title,
    tone,
    emoji: '❌',
    details: translateClockTrainingWithFallback(
      translate,
      'feedback.wrong.details.default',
      `Twoja odpowiedź: ${actualHours}:${pad(actualMinutes)}. Poprawna: ${expectedHours}:${pad(expectedMinutes)}. Różnica: ${totalMinuteDistance} min. ${hint}`,
      {
        actual: `${actualHours}:${pad(actualMinutes)}`,
        expected: `${expectedHours}:${pad(expectedMinutes)}`,
        distance: totalMinuteDistance,
        hint,
      }
    ),
  };
}

export function taskToKey(task: ClockTask): string {
  return `${task.hours}:${task.minutes}`;
}

export function buildClockTaskPrompt(
  task: ClockTask,
  section: ClockTrainingTaskPoolId = 'mixed',
  translate?: ClockTrainingTranslate
): string {
  if (section === 'hours') {
    return translateClockTrainingWithFallback(
      translate,
      'prompt.hours.default',
      'Pełna godzina. Ustaw krótką wskazówkę, a minuty zostają na 00.'
    );
  }
  if (section === 'minutes') {
    if (task.minutes === 15) {
      return translateClockTrainingWithFallback(
        translate,
        'prompt.minutes.quarterPast',
        'Kwadrans. Krótka wskazówka zostaje na 12.'
      );
    }
    if (task.minutes === 30) {
      return translateClockTrainingWithFallback(
        translate,
        'prompt.minutes.halfHour',
        'Pół godziny. Krótka wskazówka zostaje na 12.'
      );
    }
    if (task.minutes === 45) {
      return translateClockTrainingWithFallback(
        translate,
        'prompt.minutes.fortyFiveMinutes',
        '45 minut. Krótka wskazówka zostaje na 12.'
      );
    }
    return translateClockTrainingWithFallback(
      translate,
      'prompt.minutes.default',
      'Skup się na długiej wskazówce. Krótka wskazówka zostaje na 12.'
    );
  }
  if (task.minutes === 0) {
    return translateClockTrainingWithFallback(
      translate,
      'prompt.default.fullHour',
      'Pełna godzina (minuty = 00).'
    );
  }
  if (task.minutes === 15) {
    return translateClockTrainingWithFallback(
      translate,
      'prompt.default.quarterPast',
      `Kwadrans po ${task.hours}.`,
      { hour: task.hours }
    );
  }
  if (task.minutes === 30) {
    return translateClockTrainingWithFallback(
      translate,
      'prompt.default.halfTo',
      `Wpół do ${task.hours === 12 ? 1 : task.hours + 1}.`,
      {
        currentHour: task.hours,
        nextHour: task.hours === 12 ? 1 : task.hours + 1,
      }
    );
  }
  if (task.minutes === 45) {
    return translateClockTrainingWithFallback(
      translate,
      'prompt.default.quarterTo',
      `Kwadrans do ${task.hours === 12 ? 1 : task.hours + 1}.`,
      { nextHour: task.hours === 12 ? 1 : task.hours + 1 }
    );
  }
  return translateClockTrainingWithFallback(
    translate,
    'prompt.default.general',
    'Wskazówka godzin przesuwa się razem z minutami.'
  );
}

export function buildClockCorrectFeedback(
  section: ClockTrainingTaskPoolId,
  task: ClockTask,
  options: { gameMode?: ClockGameMode; streak?: number } = {},
  translate?: ClockTrainingTranslate
): ClockFeedback {
  const gameMode = options.gameMode ?? 'practice';
  const streak = options.streak ?? 0;
  const time = `${task.hours}:${pad(task.minutes)}`;

  let title = translateClockTrainingWithFallback(
    translate,
    'feedback.correct.title.default',
    'Brawo! Dobrze!'
  );
  let details = translateClockTrainingWithFallback(
    translate,
    'feedback.correct.details.default',
    `Ustawiłeś/aś poprawnie: ${time}.`,
    { time }
  );

  if (section === 'hours') {
    title = translateClockTrainingWithFallback(
      translate,
      'feedback.correct.title.hours',
      'Brawo! To dobra godzina!'
    );
    details = translateClockTrainingWithFallback(
      translate,
      'feedback.correct.details.hours',
      `Ustawiłeś/aś poprawną pełną godzinę: ${time}.`,
      { time }
    );
  } else if (section === 'minutes') {
    title = translateClockTrainingWithFallback(
      translate,
      'feedback.correct.title.minutes',
      'Brawo! Minuty się zgadzają!'
    );
    details = translateClockTrainingWithFallback(
      translate,
      'feedback.correct.details.minutes',
      `Ustawiłeś/aś poprawne minuty: ${time}.`,
      { time }
    );
  } else if (section === 'combined') {
    title = translateClockTrainingWithFallback(
      translate,
      'feedback.correct.title.combined',
      'Brawo! Pełny czas ustawiony!'
    );
    details = translateClockTrainingWithFallback(
      translate,
      'feedback.correct.details.combined',
      `Ustawiłeś/aś poprawny pełny czas: ${time}.`,
      { time }
    );
  }

  if (gameMode === 'challenge') {
    details = `${details} ${translateClockTrainingWithFallback(
      translate,
      'feedback.correct.details.challengeStreak',
      `Seria: ${streak}.`,
      { streak }
    )}`;
  }

  return {
    kind: 'correct',
    title,
    details,
    emoji: '🌟',
  };
}

export function buildClockTimeoutFeedback(
  section: ClockTrainingTaskPoolId,
  task: ClockTask,
  translate?: ClockTrainingTranslate
): ClockFeedback {
  const time = `${task.hours}:${pad(task.minutes)}`;
  const title = translateClockTrainingWithFallback(
    translate,
    'feedback.timeout.title',
    'Czas minął!'
  );

  if (section === 'hours') {
    return {
      kind: 'wrong',
      title,
      tone: 'far',
      emoji: '❌',
      details: translateClockTrainingWithFallback(
        translate,
        'feedback.timeout.details.hours',
        `Nie zdążyłeś/aś ustawić pełnej godziny. Poprawna godzina: ${time}.`,
        { time }
      ),
    };
  }

  if (section === 'minutes') {
    return {
      kind: 'wrong',
      title,
      tone: 'far',
      emoji: '❌',
      details: translateClockTrainingWithFallback(
        translate,
        'feedback.timeout.details.minutes',
        `Nie zdążyłeś/aś ustawić minut. Poprawny odczyt: ${time}.`,
        { time }
      ),
    };
  }

  if (section === 'combined') {
    return {
      kind: 'wrong',
      title,
      tone: 'far',
      emoji: '❌',
      details: translateClockTrainingWithFallback(
        translate,
        'feedback.timeout.details.combined',
        `Nie zdążyłeś/aś ustawić pełnego czasu. Poprawna godzina: ${time}.`,
        { time }
      ),
    };
  }

  return {
    kind: 'wrong',
    title,
    tone: 'far',
    emoji: '❌',
    details: translateClockTrainingWithFallback(
      translate,
      'feedback.timeout.details.default',
      `Nie zdążyłeś/aś ustawić czasu. Poprawna godzina: ${time}.`,
      { time }
    ),
  };
}

export function getClockTrainingSummaryMessage(
  section: ClockTrainingTaskPoolId,
  score: number,
  totalTasks: number,
  translate?: ClockTrainingTranslate
): string {
  const isPerfect = score === totalTasks;

  if (section === 'hours') {
    return isPerfect
      ? translateClockTrainingWithFallback(
          translate,
          'summary.hours.perfect',
          'Świetnie! Pewnie odczytujesz pełne godziny.'
        )
      : translateClockTrainingWithFallback(
          translate,
          'summary.hours.retry',
          'Poćwicz jeszcze pełne godziny i obserwuj krótką wskazówkę.'
        );
  }

  if (section === 'minutes') {
    return isPerfect
      ? translateClockTrainingWithFallback(
          translate,
          'summary.minutes.perfect',
          'Świetnie! Długa wskazówka i minuty są już pod kontrolą.'
        )
      : translateClockTrainingWithFallback(
          translate,
          'summary.minutes.retry',
          'Poćwicz jeszcze minuty, licząc kreski po 5 wokół tarczy.'
        );
  }

  if (section === 'combined') {
    return isPerfect
      ? translateClockTrainingWithFallback(
          translate,
          'summary.combined.perfect',
          'Świetnie! Łączysz godziny i minuty w pełny odczyt czasu.'
        )
      : translateClockTrainingWithFallback(
          translate,
          'summary.combined.retry',
          'Poćwicz jeszcze wspólne ustawianie godzin i minut.'
        );
  }

  return isPerfect
    ? translateClockTrainingWithFallback(
        translate,
        'summary.default.perfect',
        'Idealnie! Świetnie znasz zegar!'
      )
    : translateClockTrainingWithFallback(
        translate,
        'summary.default.retry',
        'Ćwicz dalej, a będziesz mistrzem zegara!'
      );
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
export {
  createClockTaskSet,
  resolveClockChallengeMedal,
  resolveClockPracticeTaskSet,
  getClockChallengeMedalLabel,
  pad,
};
