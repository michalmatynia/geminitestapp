import type { KangurAccent } from '@/features/kangur/ui/design/tokens';

import {
  ENGLISH_COMPARE_AND_CROWN_ROUNDS,
  type EnglishCompareAndCrownRound,
  type EnglishComparisonActionId,
  type EnglishComparisonFormId,
} from './EnglishComparativesSuperlativesCrownGame.data';
import type {
  SlottedRoundStateDto,
  SlottedRoundTokenExtractionDto,
} from './round-state-contracts';

export type ComparisonToken = {
  id: string;
  form: EnglishComparisonFormId;
};

export type RoundState = SlottedRoundStateDto<ComparisonToken>;

export type ComparisonFormMeta = {
  accent: KangurAccent;
  emoji: string;
  fill: string;
  degree: 'comparative' | 'superlative';
  family: 'height' | 'speed' | 'size' | 'humor' | 'beauty' | 'skill';
};

export const COMPARISON_FORM_META: Record<EnglishComparisonFormId, ComparisonFormMeta> = {
  taller: { accent: 'sky', emoji: '📏', fill: '#60a5fa', degree: 'comparative', family: 'height' },
  the_tallest: {
    accent: 'violet',
    emoji: '👑',
    fill: '#8b5cf6',
    degree: 'superlative',
    family: 'height',
  },
  faster: { accent: 'sky', emoji: '💨', fill: '#38bdf8', degree: 'comparative', family: 'speed' },
  the_fastest: {
    accent: 'amber',
    emoji: '🏁',
    fill: '#f59e0b',
    degree: 'superlative',
    family: 'speed',
  },
  bigger: { accent: 'emerald', emoji: '🦖', fill: '#22c55e', degree: 'comparative', family: 'size' },
  the_biggest: {
    accent: 'emerald',
    emoji: '🏆',
    fill: '#16a34a',
    degree: 'superlative',
    family: 'size',
  },
  funnier: { accent: 'rose', emoji: '😂', fill: '#fb7185', degree: 'comparative', family: 'humor' },
  the_funniest: {
    accent: 'rose',
    emoji: '🎪',
    fill: '#f43f5e',
    degree: 'superlative',
    family: 'humor',
  },
  more_beautiful: {
    accent: 'violet',
    emoji: '✨',
    fill: '#c084fc',
    degree: 'comparative',
    family: 'beauty',
  },
  the_most_beautiful: {
    accent: 'violet',
    emoji: '🖼️',
    fill: '#a855f7',
    degree: 'superlative',
    family: 'beauty',
  },
  better: { accent: 'amber', emoji: '⭐', fill: '#fbbf24', degree: 'comparative', family: 'skill' },
  the_best: {
    accent: 'amber',
    emoji: '🥇',
    fill: '#f59e0b',
    degree: 'superlative',
    family: 'skill',
  },
};

export const COMPARISON_GUIDES = [
  {
    key: 'tall',
    base: 'tall',
    comparative: 'taller' as const,
    superlative: 'the_tallest' as const,
    hint: 'short adjective + -er / -est',
  },
  {
    key: 'big',
    base: 'big',
    comparative: 'bigger' as const,
    superlative: 'the_biggest' as const,
    hint: 'double the final consonant',
  },
  {
    key: 'funny',
    base: 'funny',
    comparative: 'funnier' as const,
    superlative: 'the_funniest' as const,
    hint: 'y changes to i',
  },
  {
    key: 'beautiful',
    base: 'beautiful',
    comparative: 'more_beautiful' as const,
    superlative: 'the_most_beautiful' as const,
    hint: 'use more / the most',
  },
  {
    key: 'good',
    base: 'good',
    comparative: 'better' as const,
    superlative: 'the_best' as const,
    hint: 'special family',
  },
];

export const ACTION_META: Record<EnglishComparisonActionId, { emoji: string }> = {
  tall_compare: { emoji: '🏗️' },
  tall_crown: { emoji: '🏰' },
  fast_compare: { emoji: '🏃' },
  fast_crown: { emoji: '🏁' },
  big_compare: { emoji: '👾' },
  big_crown: { emoji: '🦖' },
  funny_compare: { emoji: '🤹' },
  funny_crown: { emoji: '🎪' },
  beautiful_compare: { emoji: '🎨' },
  beautiful_crown: { emoji: '🖼️' },
  good_compare: { emoji: '🎤' },
  good_crown: { emoji: '🥇' },
};

export const shuffle = <T,>(items: readonly T[]): T[] => [...items].sort(() => Math.random() - 0.5);

export const buildRoundState = (round: EnglishCompareAndCrownRound): RoundState => ({
  pool: shuffle(
    round.tokens.map((form, index) => ({
      id: `token-${round.id}-${index}-${form}`,
      form,
    }))
  ),
  slots: Object.fromEntries(round.actions.map((action) => [action.id, null])),
});

export const TOTAL_ROUNDS = ENGLISH_COMPARE_AND_CROWN_ROUNDS.length;
export const TOTAL_TARGETS = ENGLISH_COMPARE_AND_CROWN_ROUNDS.reduce(
  (sum, round) => sum + round.actions.length,
  0
);

export const getRoundTitle = (roundId: EnglishCompareAndCrownRound['id']): string => {
  switch (roundId) {
    case 'tower-track':
      return 'Tower track';
    case 'monster-stage':
      return 'Monster stage';
    case 'gallery-music':
      return 'Gallery and music hall';
    case 'sports-day':
      return 'Sports day';
    case 'fun-club':
      return 'Fun club';
  }
};

export const getRoundPrompt = (roundId: EnglishCompareAndCrownRound['id']): string => {
  switch (roundId) {
    case 'tower-track':
      return 'Build the right comparative and superlative forms for towers and runners.';
    case 'monster-stage':
      return 'Compare the monsters, then crown the biggest one.';
    case 'gallery-music':
      return 'Choose the better sentence for the gallery and the music scene.';
    case 'sports-day':
      return 'Spot who is faster and who becomes the fastest in the group.';
    case 'fun-club':
      return 'Find the funniest clown and the best performer in the club.';
  }
};

export const getFormLabel = (form: EnglishComparisonFormId): string => {
  switch (form) {
    case 'taller':
      return 'taller';
    case 'the_tallest':
      return 'the tallest';
    case 'faster':
      return 'faster';
    case 'the_fastest':
      return 'the fastest';
    case 'bigger':
      return 'bigger';
    case 'the_biggest':
      return 'the biggest';
    case 'funnier':
      return 'funnier';
    case 'the_funniest':
      return 'the funniest';
    case 'more_beautiful':
      return 'more beautiful';
    case 'the_most_beautiful':
      return 'the most beautiful';
    case 'better':
      return 'better';
    case 'the_best':
      return 'the best';
  }
};

export const getFormDescription = (form: EnglishComparisonFormId): string =>
  COMPARISON_FORM_META[form].degree === 'comparative'
    ? 'compare two things'
    : 'choose one winner in a group';

export const getDegreeCueLabel = (form: EnglishComparisonFormId): string =>
  COMPARISON_FORM_META[form].degree === 'comparative'
    ? 'compare two things'
    : 'choose the top one in a group';

export const getActionLabel = (actionId: EnglishComparisonActionId): string => {
  switch (actionId) {
    case 'tall_compare':
      return 'Tower compare';
    case 'tall_crown':
      return 'Tower crown';
    case 'fast_compare':
      return 'Runner compare';
    case 'fast_crown':
      return 'Runner crown';
    case 'big_compare':
      return 'Monster compare';
    case 'big_crown':
      return 'Monster crown';
    case 'funny_compare':
      return 'Clown compare';
    case 'funny_crown':
      return 'Clown crown';
    case 'beautiful_compare':
      return 'Gallery compare';
    case 'beautiful_crown':
      return 'Gallery crown';
    case 'good_compare':
      return 'Singer compare';
    case 'good_crown':
      return 'Singer crown';
  }
};

export const getQuestionLabel = (actionId: EnglishComparisonActionId): string => {
  switch (actionId) {
    case 'tall_compare':
      return 'Who is taller?';
    case 'tall_crown':
      return 'Who is the tallest?';
    case 'fast_compare':
      return 'Who is faster?';
    case 'fast_crown':
      return 'Who is the fastest?';
    case 'big_compare':
      return 'Who is bigger?';
    case 'big_crown':
      return 'Who is the biggest?';
    case 'funny_compare':
      return 'Who is funnier?';
    case 'funny_crown':
      return 'Who is the funniest?';
    case 'beautiful_compare':
      return 'Which painting is more beautiful?';
    case 'beautiful_crown':
      return 'Which painting is the most beautiful?';
    case 'good_compare':
      return 'Who sings better?';
    case 'good_crown':
      return 'Who is the best singer?';
  }
};

export const slotDroppableId = (slotId: string): string => `slot-${slotId}`;
export const isSlotDroppable = (value: string): boolean => value.startsWith('slot-');
export const getSlotIdFromDroppable = (value: string): string => value.replace('slot-', '');

export const takeTokenFromState = (
  state: RoundState,
  tokenId: string
): SlottedRoundTokenExtractionDto<ComparisonToken> => {
  const poolIndex = state.pool.findIndex((token) => token.id === tokenId);
  if (poolIndex !== -1) {
    const nextPool = [...state.pool];
    const [token] = nextPool.splice(poolIndex, 1);
    return {
      token,
      pool: nextPool,
      slots: { ...state.slots },
    };
  }

  const nextSlots = { ...state.slots };
  for (const [slotId, token] of Object.entries(nextSlots)) {
    if (token?.id === tokenId) {
      nextSlots[slotId] = null;
      return {
        token,
        pool: [...state.pool],
        slots: nextSlots,
      };
    }
  }

  return {
    pool: [...state.pool],
    slots: { ...state.slots },
  };
};

export const countRoundCorrect = (round: EnglishCompareAndCrownRound, state: RoundState): number =>
  round.actions.reduce((sum, action) => {
    return sum + (state.slots[action.id]?.form === action.answer ? 1 : 0);
  }, 0);

export const buildEnglishComparisonSentenceTemplate = (
  actionId: EnglishComparisonActionId
): string => {
  switch (actionId) {
    case 'tall_compare':
      return 'The blue tower is ___ than the pink tower.';
    case 'tall_crown':
      return 'The blue tower is ___ tower.';
    case 'fast_compare':
      return 'The yellow runner is ___ than the orange runner.';
    case 'fast_crown':
      return 'The yellow runner is ___ runner.';
    case 'big_compare':
      return 'The green monster is ___ than the purple monster.';
    case 'big_crown':
      return 'The green monster is ___ monster.';
    case 'funny_compare':
      return 'The red clown is ___ than the blue clown.';
    case 'funny_crown':
      return 'The red clown is ___ clown.';
    case 'beautiful_compare':
      return 'The star painting is ___ than the dot painting.';
    case 'beautiful_crown':
      return 'The star painting is ___ painting.';
    case 'good_compare':
      return 'Mia sings ___ than Leo.';
    case 'good_crown':
      return 'Mia is ___ singer.';
  }
};

export const buildEnglishComparisonSentence = (
  actionId: EnglishComparisonActionId,
  form: EnglishComparisonFormId
): string => {
  const label = getFormLabel(form);
  switch (actionId) {
    case 'tall_compare':
      return `The blue tower is ${label} than the pink tower.`;
    case 'tall_crown':
      return `The blue tower is ${label} tower.`;
    case 'fast_compare':
      return `The yellow runner is ${label} than the orange runner.`;
    case 'fast_crown':
      return `The yellow runner is ${label} runner.`;
    case 'big_compare':
      return `The green monster is ${label} than the purple monster.`;
    case 'big_crown':
      return `The green monster is ${label} monster.`;
    case 'funny_compare':
      return `The red clown is ${label} than the blue clown.`;
    case 'funny_crown':
      return `The red clown is ${label} clown.`;
    case 'beautiful_compare':
      return `The star painting is ${label} than the dot painting.`;
    case 'beautiful_crown':
      return `The star painting is ${label} painting.`;
    case 'good_compare':
      return `Mia sings ${label} than Leo.`;
    case 'good_crown':
      return `Mia is ${label} singer.`;
  }
};
