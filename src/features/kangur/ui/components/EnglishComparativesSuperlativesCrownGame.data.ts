import type { KangurAccent } from '@/features/kangur/ui/design/tokens';

export type EnglishComparisonFormId =
  | 'taller'
  | 'the_tallest'
  | 'faster'
  | 'the_fastest'
  | 'bigger'
  | 'the_biggest'
  | 'funnier'
  | 'the_funniest'
  | 'more_beautiful'
  | 'the_most_beautiful'
  | 'better'
  | 'the_best';

export type EnglishComparisonActionId =
  | 'tall_compare'
  | 'tall_crown'
  | 'fast_compare'
  | 'fast_crown'
  | 'big_compare'
  | 'big_crown'
  | 'funny_compare'
  | 'funny_crown'
  | 'beautiful_compare'
  | 'beautiful_crown'
  | 'good_compare'
  | 'good_crown';

type EnglishCompareAndCrownAction = {
  id: string;
  actionId: EnglishComparisonActionId;
  answer: EnglishComparisonFormId;
};

type EnglishCompareAndCrownRound = {
  id:
    | 'tower-track'
    | 'monster-stage'
    | 'gallery-music'
    | 'sports-day'
    | 'fun-club';
  accent: KangurAccent;
  tokens: readonly EnglishComparisonFormId[];
  actions: readonly [
    EnglishCompareAndCrownAction,
    EnglishCompareAndCrownAction,
    EnglishCompareAndCrownAction,
  ];
};

export const ENGLISH_COMPARE_AND_CROWN_ROUNDS = [
  {
    id: 'tower-track',
    accent: 'sky',
    tokens: ['taller', 'the_tallest', 'faster', 'the_fastest', 'bigger'],
    actions: [
      { id: 'tower-track-tall', actionId: 'tall_compare', answer: 'taller' },
      { id: 'tower-track-fast', actionId: 'fast_compare', answer: 'faster' },
      { id: 'tower-track-crown', actionId: 'tall_crown', answer: 'the_tallest' },
    ],
  },
  {
    id: 'monster-stage',
    accent: 'emerald',
    tokens: ['bigger', 'the_biggest', 'funnier', 'the_funniest', 'taller'],
    actions: [
      { id: 'monster-stage-big', actionId: 'big_compare', answer: 'bigger' },
      { id: 'monster-stage-funny', actionId: 'funny_compare', answer: 'funnier' },
      { id: 'monster-stage-crown', actionId: 'big_crown', answer: 'the_biggest' },
    ],
  },
  {
    id: 'gallery-music',
    accent: 'violet',
    tokens: ['more_beautiful', 'the_most_beautiful', 'better', 'the_best', 'faster'],
    actions: [
      {
        id: 'gallery-music-beautiful',
        actionId: 'beautiful_compare',
        answer: 'more_beautiful',
      },
      { id: 'gallery-music-good', actionId: 'good_compare', answer: 'better' },
      {
        id: 'gallery-music-crown',
        actionId: 'beautiful_crown',
        answer: 'the_most_beautiful',
      },
    ],
  },
  {
    id: 'sports-day',
    accent: 'amber',
    tokens: ['faster', 'the_fastest', 'better', 'the_best', 'funnier'],
    actions: [
      { id: 'sports-day-fast', actionId: 'fast_compare', answer: 'faster' },
      { id: 'sports-day-good', actionId: 'good_compare', answer: 'better' },
      { id: 'sports-day-crown', actionId: 'fast_crown', answer: 'the_fastest' },
    ],
  },
  {
    id: 'fun-club',
    accent: 'rose',
    tokens: ['funnier', 'the_funniest', 'better', 'the_best', 'more_beautiful'],
    actions: [
      { id: 'fun-club-funny', actionId: 'funny_compare', answer: 'funnier' },
      { id: 'fun-club-best', actionId: 'good_crown', answer: 'the_best' },
      { id: 'fun-club-crown', actionId: 'funny_crown', answer: 'the_funniest' },
    ],
  },
] as const satisfies readonly EnglishCompareAndCrownRound[];
