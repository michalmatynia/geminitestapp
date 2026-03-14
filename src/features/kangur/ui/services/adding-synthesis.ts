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

export type AddingSynthesisStage = (typeof ADDING_SYNTHESIS_STAGES)[number];
export type AddingSynthesisStageId = AddingSynthesisStage['id'];
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

export const getAddingSynthesisStage = (stageId: AddingSynthesisStageId): AddingSynthesisStage =>
  ADDING_SYNTHESIS_STAGES.find((stage) => stage.id === stageId) ?? ADDING_SYNTHESIS_STAGES[0];

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

const buildChoices = (
  answer: number,
  stageId: AddingSynthesisStageId,
  random: RandomSource
): [number, number, number, number] => {
  const offsets =
    stageId === 'double_digits'
      ? [-10, -1, 1, 10, -11, 11, -9, 9, -20, 20]
      : stageId === 'bridge_ten'
        ? [-3, -2, -1, 1, 2, 3, -10, 10]
        : [-4, -3, -2, -1, 1, 2, 3, 4];

  const candidates = shuffle(offsets, random);
  const values = new Set<number>([answer]);

  for (const offset of candidates) {
    const candidate = answer + offset;
    if (candidate > 0) {
      values.add(candidate);
    }
    if (values.size >= 4) {
      break;
    }
  }

  let fallbackDelta = stageId === 'double_digits' ? 5 : 1;
  while (values.size < 4) {
    const nextCandidate = answer + fallbackDelta;
    if (nextCandidate > 0) {
      values.add(nextCandidate);
    }

    if (values.size < 4) {
      const mirroredCandidate = answer - fallbackDelta;
      if (mirroredCandidate > 0) {
        values.add(mirroredCandidate);
      }
    }

    fallbackDelta += stageId === 'double_digits' ? 5 : 1;
  }

  const shuffledChoices = shuffle(Array.from(values).slice(0, 4), random);
  return [
    shuffledChoices[0] ?? answer,
    shuffledChoices[1] ?? answer + 1,
    shuffledChoices[2] ?? answer + 2,
    shuffledChoices[3] ?? answer + 3,
  ];
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
