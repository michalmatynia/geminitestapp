import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import type { KangurMiniGameTranslate } from '@/features/kangur/ui/constants/mini-game-i18n';

type BaseRound = {
  id: string;
  accent: KangurAccent;
};

type ChoiceRound = BaseRound & {
  kind: 'choice';
  options: string[];
  answer: string;
};

type TimedRound = BaseRound & {
  kind: 'timed';
  options: string[];
  answer: string;
  timeLimitSec: number;
};

type OrderRound = BaseRound & {
  kind: 'order';
  tokens: string[];
  answer: string[];
};

type FillRound = BaseRound & {
  kind: 'fill';
  answers: string[];
  placeholder?: string;
};

export type EnglishSentenceStructureRound =
  | ChoiceRound
  | TimedRound
  | OrderRound
  | FillRound;

export type EnglishSentenceStructureRoundState = {
  selection: string | null;
  orderTokens: string[];
  fillValue: string;
};

export const ENGLISH_SENTENCE_STRUCTURE_ROUNDS: EnglishSentenceStructureRound[] = [
  {
    id: 'svo-order',
    kind: 'choice',
    accent: 'violet',
    answer: 'The drummer plays the rhythm.',
    options: [
      'Plays the drummer the rhythm.',
      'The drummer plays the rhythm.',
      'The rhythm plays the drummer.',
      'Plays the rhythm the drummer.',
    ],
  },
  {
    id: 'order-words',
    kind: 'order',
    accent: 'sky',
    tokens: ['My', 'friend', 'always', 'finishes', 'homework', 'on', 'time'],
    answer: ['My', 'friend', 'always', 'finishes', 'homework', 'on', 'time'],
  },
  {
    id: 'do-question',
    kind: 'fill',
    accent: 'indigo',
    answers: ['do'],
    placeholder: 'do / does',
  },
  {
    id: 'connector-so',
    kind: 'timed',
    accent: 'amber',
    answer: 'so',
    options: ['so', 'because', 'but', 'when'],
    timeLimitSec: 8,
  },
  {
    id: 'frequency-adverb',
    kind: 'choice',
    accent: 'teal',
    answer: 'often',
    options: ['often', 'after', 'quickly', 'yesterday'],
  },
  {
    id: 'does-negative',
    kind: 'fill',
    accent: 'rose',
    answers: ['doesn\'t', 'does not'],
    placeholder: 'doesn\'t',
  },
];

export const TOTAL_ENGLISH_SENTENCE_STRUCTURE_ROUNDS =
  ENGLISH_SENTENCE_STRUCTURE_ROUNDS.length;

export const getSentenceStructurePrompt = (
  translate: KangurMiniGameTranslate,
  roundId: EnglishSentenceStructureRound['id']
): string => translate(`englishSentenceStructure.inRound.rounds.${roundId}.prompt`);

export const getSentenceStructureHint = (
  translate: KangurMiniGameTranslate,
  roundId: EnglishSentenceStructureRound['id']
): string => translate(`englishSentenceStructure.inRound.rounds.${roundId}.hint`);

export const getSentenceStructureQuestion = (
  translate: KangurMiniGameTranslate,
  roundId: EnglishSentenceStructureRound['id']
): string => translate(`englishSentenceStructure.inRound.rounds.${roundId}.question`);

export const shuffleSentenceStructureItems = <T,>(items: T[]): T[] =>
  [...items].sort(() => Math.random() - 0.5);

export const reorderSentenceStructureList = <T,>(
  list: T[],
  startIndex: number,
  endIndex: number
): T[] => {
  const updated = [...list];
  const [removed] = updated.splice(startIndex, 1);
  if (removed === undefined) {
    return updated;
  }
  updated.splice(endIndex, 0, removed);
  return updated;
};

const normalizeText = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[.!?]/g, '')
    .replace(/\s+/g, ' ');

export const evaluateSentenceStructureRound = (
  round: EnglishSentenceStructureRound,
  { selection, orderTokens, fillValue }: EnglishSentenceStructureRoundState
): { isCorrect: boolean; correctAnswerLabel: string } => {
  switch (round.kind) {
    case 'choice':
    case 'timed': {
      const isCorrect =
        Boolean(selection) &&
        normalizeText(selection ?? '') === normalizeText(round.answer);
      return { isCorrect, correctAnswerLabel: round.answer };
    }
    case 'order': {
      const normalizedAnswer = round.answer.map(normalizeText);
      const normalizedOrder = orderTokens.map(normalizeText);
      const isCorrect =
        normalizedAnswer.length === normalizedOrder.length &&
        normalizedAnswer.every((value, index) => value === normalizedOrder[index]);
      return { isCorrect, correctAnswerLabel: round.answer.join(' ') };
    }
    case 'fill': {
      const normalizedGuess = normalizeText(fillValue);
      const normalizedAnswers = round.answers.map(normalizeText);
      const isCorrect = normalizedAnswers.includes(normalizedGuess);
      return { isCorrect, correctAnswerLabel: round.answers[0] ?? '' };
    }
    default:
      return { isCorrect: false, correctAnswerLabel: '' };
  }
};

export const createSentenceStructureRoundState = (
  round: EnglishSentenceStructureRound
): EnglishSentenceStructureRoundState => ({
  selection: null,
  orderTokens:
    round.kind === 'order' ? shuffleSentenceStructureItems(round.tokens) : [],
  fillValue: '',
});

export const isSentenceStructureRoundReady = (
  round: EnglishSentenceStructureRound,
  state: EnglishSentenceStructureRoundState
): boolean => {
  switch (round.kind) {
    case 'choice':
    case 'timed':
      return Boolean(state.selection);
    case 'order':
      return state.orderTokens.length > 0;
    case 'fill':
      return state.fillValue.trim().length > 0;
    default:
      return false;
  }
};
