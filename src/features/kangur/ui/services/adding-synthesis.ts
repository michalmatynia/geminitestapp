import type { TranslationValues } from 'use-intl';

import {
  type KangurMiniGameTranslate,
  translateKangurMiniGameWithFallback,
} from '@/features/kangur/ui/constants/mini-game-i18n';

export const ADDING_SYNTHESIS_NOTE_DURATION_MS = 4_200;
export const ADDING_SYNTHESIS_FEEDBACK_PAUSE_MS = 950;
export const ADDING_SYNTHESIS_HIT_LINE_RATIO = 0.82;

export const ADDING_SYNTHESIS_STAGES = [
  {
    id: 'warmup',
    icon: '🌱',
    title: 'Rozgrzewka',
    description: 'Sumy do 10. Najpierw znajdź większą liczbę i dolicz resztę.',
    coachingTip: 'Policz od większej liczby i patrz, jak działanie spada do linii.',
    accent: 'amber',
    noteCount: 4,
  },
  {
    id: 'bridge_ten',
    icon: '🌉',
    title: 'Most do 10',
    description: 'Przekraczaj 10, rozbijając drugą liczbę na kawałek do 10 i resztę.',
    coachingTip: 'Zobacz, ile brakuje do 10, a potem dodaj to, co zostało.',
    accent: 'sky',
    noteCount: 4,
  },
  {
    id: 'double_digits',
    icon: '🚀',
    title: 'Dwie cyfry',
    description:
      'Dodawaj dziesiątki i jedności osobno, a przy przeniesieniu zamieniaj 10 jedności na nową dziesiątkę.',
    coachingTip:
      'Najpierw dziesiątki, potem jedności. Gdy wyjdzie 10 lub więcej, przenieś jedną dziesiątkę.',
    accent: 'emerald',
    noteCount: 4,
  },
] as const;

export type AddingSynthesisStageId = (typeof ADDING_SYNTHESIS_STAGES)[number]['id'];
export type AddingSynthesisStage = {
  id: AddingSynthesisStageId;
  icon: string;
  title: string;
  description: string;
  coachingTip: string;
  accent: (typeof ADDING_SYNTHESIS_STAGES)[number]['accent'];
  noteCount: number;
};
export type AddingSynthesisTimingGrade = 'perfect' | 'great' | 'good';

export type AddingSynthesisNote = {
  id: string;
  stageId: AddingSynthesisStageId;
  left: number;
  right: number;
  answer: number;
  choices: [number, number, number, number];
  hint: string;
  focus: string;
};

type RandomSource = () => number;

type AddingSynthesisTranslate = KangurMiniGameTranslate;

const translateAddingSynthesisWithFallback = (
  translate: AddingSynthesisTranslate | undefined,
  key: string,
  fallback: string,
  values?: TranslationValues
): string =>
  translateKangurMiniGameWithFallback(
    translate,
    `addingSynthesis.${key}`,
    fallback,
    values
  );

export const getAddingSynthesisStage = (stageId: AddingSynthesisStageId): AddingSynthesisStage =>
  ADDING_SYNTHESIS_STAGES.find((stage) => stage.id === stageId) ?? ADDING_SYNTHESIS_STAGES[0];

export const getLocalizedAddingSynthesisStage = (
  stageId: AddingSynthesisStageId,
  translate?: AddingSynthesisTranslate
): AddingSynthesisStage => {
  const stage = getAddingSynthesisStage(stageId);

  return {
    ...stage,
    title: translateAddingSynthesisWithFallback(
      translate,
      `stages.${stageId}.title`,
      stage.title
    ),
    description: translateAddingSynthesisWithFallback(
      translate,
      `stages.${stageId}.description`,
      stage.description
    ),
    coachingTip: translateAddingSynthesisWithFallback(
      translate,
      `stages.${stageId}.coachingTip`,
      stage.coachingTip
    ),
  };
};

export const getLocalizedAddingSynthesisStages = (
  translate?: AddingSynthesisTranslate
): AddingSynthesisStage[] =>
  ADDING_SYNTHESIS_STAGES.map((stage) =>
    getLocalizedAddingSynthesisStage(stage.id, translate)
  );

const randomInt = (min: number, max: number, random: RandomSource): number =>
  Math.floor(random() * (max - min + 1)) + min;

const shuffle = <T>(values: readonly T[], random: RandomSource): T[] => {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = next[index];
    next[index] = next[swapIndex] as T;
    next[swapIndex] = current as T;
  }
  return next;
};

const buildCountUpHint = (left: number, right: number): string => {
  const larger = Math.max(left, right);
  const smaller = Math.min(left, right);
  const steps = Array.from({ length: smaller }, (_, index) => larger + index + 1).join(', ');
  return `Zacznij od ${larger} i dolicz ${smaller}: ${steps}.`;
};

const buildBridgeTenHint = (left: number, right: number): string => {
  const toTen = 10 - left;
  const leftover = right - toTen;
  return `${left} potrzebuje ${toTen} do 10. Rozbij ${right} na ${toTen} i ${leftover}, potem policz 10 + ${leftover} = ${left + right}.`;
};

const buildDoubleDigitHint = (left: number, right: number): string => {
  const tens = Math.floor(left / 10) * 10 + Math.floor(right / 10) * 10;
  const ones = (left % 10) + (right % 10);

  if (ones >= 10) {
    return `Dziesiątki dają ${tens}. Jedności dają ${ones}, czyli ${ones - 10} i jedna nowa dziesiątka. Razem wychodzi ${left + right}.`;
  }

  return `Dziesiątki dają ${tens}, jedności dają ${ones}. Razem ${left + right}.`;
};

const getAddingSynthesisCarry = (note: Pick<AddingSynthesisNote, 'left' | 'right'>): boolean =>
  (note.left % 10) + (note.right % 10) >= 10;

export const getLocalizedAddingSynthesisNoteHint = (
  note: AddingSynthesisNote,
  translate?: AddingSynthesisTranslate
): string => {
  if (note.stageId === 'warmup') {
    const larger = Math.max(note.left, note.right);
    const smaller = Math.min(note.left, note.right);
    const steps = Array.from({ length: smaller }, (_, index) => larger + index + 1).join(', ');

    return translateAddingSynthesisWithFallback(
      translate,
      'hints.warmup',
      buildCountUpHint(note.left, note.right),
      { larger, smaller, steps }
    );
  }

  if (note.stageId === 'bridge_ten') {
    const toTen = 10 - note.left;
    const leftover = note.right - toTen;

    return translateAddingSynthesisWithFallback(
      translate,
      'hints.bridgeTen',
      buildBridgeTenHint(note.left, note.right),
      {
        left: note.left,
        right: note.right,
        toTen,
        leftover,
        answer: note.answer,
      }
    );
  }

  const tens = Math.floor(note.left / 10) * 10 + Math.floor(note.right / 10) * 10;
  const ones = (note.left % 10) + (note.right % 10);
  const carryOnes = Math.max(0, ones - 10);

  return getAddingSynthesisCarry(note)
    ? translateAddingSynthesisWithFallback(
        translate,
        'hints.doubleDigitsCarry',
        buildDoubleDigitHint(note.left, note.right),
        { tens, ones, carryOnes, answer: note.answer }
      )
    : translateAddingSynthesisWithFallback(
        translate,
        'hints.doubleDigits',
        buildDoubleDigitHint(note.left, note.right),
        { tens, ones, answer: note.answer }
      );
};

export const getLocalizedAddingSynthesisNoteFocus = (
  note: AddingSynthesisNote,
  translate?: AddingSynthesisTranslate
): string => {
  if (note.stageId === 'warmup') {
    return translateAddingSynthesisWithFallback(
      translate,
      'focus.warmup',
      note.focus
    );
  }

  if (note.stageId === 'bridge_ten') {
    return translateAddingSynthesisWithFallback(
      translate,
      'focus.bridgeTen',
      note.focus
    );
  }

  return getAddingSynthesisCarry(note)
    ? translateAddingSynthesisWithFallback(
        translate,
        'focus.doubleDigitsCarry',
        note.focus
      )
    : translateAddingSynthesisWithFallback(
        translate,
        'focus.doubleDigits',
        note.focus
      );
};

export const getLocalizedAddingSynthesisFeedback = ({
  kind,
  note,
  chosenValue,
  translate,
}: {
  kind: AddingSynthesisTimingGrade | 'wrong' | 'miss';
  note: AddingSynthesisNote;
  chosenValue?: number | null;
  translate?: AddingSynthesisTranslate;
}): { title: string; description: string } => {
  if (kind === 'perfect') {
    return {
      title: translateAddingSynthesisWithFallback(
        translate,
        'feedback.perfect.title',
        'Idealne trafienie'
      ),
      description: translateAddingSynthesisWithFallback(
        translate,
        'feedback.perfect.description',
        `${note.left} + ${note.right} = ${note.answer}. Uderzyłeś dokładnie przy linii.`,
        { left: note.left, right: note.right, answer: note.answer }
      ),
    };
  }

  if (kind === 'great') {
    return {
      title: translateAddingSynthesisWithFallback(
        translate,
        'feedback.great.title',
        'Super timing'
      ),
      description: translateAddingSynthesisWithFallback(
        translate,
        'feedback.great.description',
        `${note.left} + ${note.right} = ${note.answer}. Dobra odpowiedź i dobry rytm.`,
        { left: note.left, right: note.right, answer: note.answer }
      ),
    };
  }

  if (kind === 'good') {
    return {
      title: translateAddingSynthesisWithFallback(
        translate,
        'feedback.good.title',
        'Dobra odpowiedź'
      ),
      description: translateAddingSynthesisWithFallback(
        translate,
        'feedback.good.description',
        `${note.left} + ${note.right} = ${note.answer}. Następnym razem spróbuj trafić bliżej linii.`,
        { left: note.left, right: note.right, answer: note.answer }
      ),
    };
  }

  if (kind === 'wrong') {
    return {
      title: translateAddingSynthesisWithFallback(
        translate,
        'feedback.wrong.title',
        'To nie ten tor'
      ),
      description: translateAddingSynthesisWithFallback(
        translate,
        'feedback.wrong.description',
        `${note.left} + ${note.right} daje ${note.answer}, nie ${chosenValue ?? 'ten wynik'}.`,
        {
          left: note.left,
          right: note.right,
          answer: note.answer,
          chosen: chosenValue ?? 'ten wynik',
        }
      ),
    };
  }

  return {
    title: translateAddingSynthesisWithFallback(
      translate,
      'feedback.miss.title',
      'Nuta minęła linię'
    ),
    description: translateAddingSynthesisWithFallback(
      translate,
      'feedback.miss.description',
      `Poprawny wynik to ${note.answer}. Złap kolejną nutę szybciej.`,
      { answer: note.answer }
    ),
  };
};

const buildChoices = (
  answer: number,
  stageId: AddingSynthesisStageId,
  random: RandomSource
): [number, number, number, number] => {
  const values = seedChoiceValues(answer, stageId, random);
  fillFallbackChoiceValues(values, answer, stageId);
  const shuffledChoices = shuffle(Array.from(values).slice(0, 4), random);
  return [
    shuffledChoices[0] ?? answer,
    shuffledChoices[1] ?? answer + 1,
    shuffledChoices[2] ?? answer + 2,
    shuffledChoices[3] ?? answer + 3,
  ];
};

const resolveChoiceOffsets = (stageId: AddingSynthesisStageId): readonly number[] => {
  switch (stageId) {
    case 'double_digits':
      return [-10, -1, 1, 10, -11, 11, -9, 9, -20, 20];
    case 'bridge_ten':
      return [-3, -2, -1, 1, 2, 3, -10, 10];
    case 'warmup':
    default:
      return [-4, -3, -2, -1, 1, 2, 3, 4];
  }
};

const resolveChoiceFallbackStep = (stageId: AddingSynthesisStageId): number =>
  stageId === 'double_digits' ? 5 : 1;

const addPositiveChoiceCandidate = (values: Set<number>, candidate: number): void => {
  if (candidate > 0) {
    values.add(candidate);
  }
};

const seedChoiceValues = (
  answer: number,
  stageId: AddingSynthesisStageId,
  random: RandomSource
): Set<number> => {
  const values = new Set<number>([answer]);
  const candidates = shuffle(resolveChoiceOffsets(stageId), random);

  for (const offset of candidates) {
    addPositiveChoiceCandidate(values, answer + offset);
    if (values.size >= 4) {
      break;
    }
  }

  return values;
};

const fillFallbackChoiceValues = (
  values: Set<number>,
  answer: number,
  stageId: AddingSynthesisStageId
): void => {
  const step = resolveChoiceFallbackStep(stageId);
  let fallbackDelta = step;

  while (values.size < 4) {
    addPositiveChoiceCandidate(values, answer + fallbackDelta);
    if (values.size < 4) {
      addPositiveChoiceCandidate(values, answer - fallbackDelta);
    }
    fallbackDelta += step;
  }
};

const createWarmupNote = (index: number, random: RandomSource): AddingSynthesisNote => {
  const left = randomInt(1, 8, random);
  const maxRight = Math.max(1, 10 - left);
  const right = randomInt(1, maxRight, random);
  const answer = left + right;

  return {
    id: `adding-synthesis-warmup-${index + 1}`,
    stageId: 'warmup',
    left,
    right,
    answer,
    choices: buildChoices(answer, 'warmup', random),
    hint: buildCountUpHint(left, right),
    focus: 'Zacznij od większej liczby i dolicz małe kroki.',
  };
};

const createBridgeTenNote = (index: number, random: RandomSource): AddingSynthesisNote => {
  const left = randomInt(6, 9, random);
  const toTen = 10 - left;
  const right = randomInt(toTen + 1, 9, random);
  const answer = left + right;

  return {
    id: `adding-synthesis-bridge-${index + 1}`,
    stageId: 'bridge_ten',
    left,
    right,
    answer,
    choices: buildChoices(answer, 'bridge_ten', random),
    hint: buildBridgeTenHint(left, right),
    focus: 'Najpierw dopełnij do 10, potem dodaj to, co zostało.',
  };
};

const createDoubleDigitNote = (index: number, random: RandomSource): AddingSynthesisNote => {
  const carry = index >= 2;
  const leftTens = randomInt(1, 3, random) * 10;
  const rightTens = randomInt(1, 3, random) * 10;
  const leftOnes = randomInt(1, 8, random);
  let rightOnes = randomInt(1, 8, random);

  if (carry && leftOnes + rightOnes < 10) {
    rightOnes = Math.min(9, 10 - leftOnes + randomInt(0, 2, random));
  }

  if (!carry && leftOnes + rightOnes >= 10) {
    rightOnes = Math.max(1, 9 - leftOnes);
  }

  const left = leftTens + leftOnes;
  const right = rightTens + rightOnes;
  const answer = left + right;

  return {
    id: `adding-synthesis-double-${index + 1}`,
    stageId: 'double_digits',
    left,
    right,
    answer,
    choices: buildChoices(answer, 'double_digits', random),
    hint: buildDoubleDigitHint(left, right),
    focus: carry
      ? 'Pilnuj jedności. Gdy uzbierasz 10, przenieś jedną dziesiątkę.'
      : 'Rozdziel dziesiątki i jedności, a potem połącz oba wyniki.',
  };
};

export const createAddingSynthesisSequence = (
  random: RandomSource = Math.random
): AddingSynthesisNote[] =>
  ADDING_SYNTHESIS_STAGES.flatMap((stage) =>
    Array.from({ length: stage.noteCount }, (_, index) => {
      if (stage.id === 'warmup') {
        return createWarmupNote(index, random);
      }

      if (stage.id === 'bridge_ten') {
        return createBridgeTenNote(index, random);
      }

      return createDoubleDigitNote(index, random);
    })
  );

export const getAddingSynthesisTimingGrade = (
  progressRatio: number
): AddingSynthesisTimingGrade => {
  const clampedProgress = Math.max(0, Math.min(progressRatio, 1));
  const distance = Math.abs(clampedProgress - ADDING_SYNTHESIS_HIT_LINE_RATIO);

  if (distance <= 0.08) {
    return 'perfect';
  }

  if (distance <= 0.17) {
    return 'great';
  }

  return 'good';
};
