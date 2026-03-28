import type { KangurAccent } from '@/features/kangur/ui/design/tokens';

export type EnglishAdverbId =
  | 'fast'
  | 'carefully'
  | 'beautifully'
  | 'happily'
  | 'well'
  | 'badly';

export type EnglishAdverbActionId =
  | 'run_race'
  | 'paint_picture'
  | 'carry_books'
  | 'play_football'
  | 'write_story'
  | 'sing_song'
  | 'dance_show';

type EnglishAdverbsActionStudioAction = {
  id: string;
  actionId: EnglishAdverbActionId;
  answer: EnglishAdverbId;
};

export type EnglishAdverbsActionStudioRound = {
  id:
    | 'race-day'
    | 'school-studio'
    | 'talent-corner'
    | 'playground-show'
    | 'homework-club';
  accent: KangurAccent;
  tokens: readonly EnglishAdverbId[];
  actions: readonly [
    EnglishAdverbsActionStudioAction,
    EnglishAdverbsActionStudioAction,
    EnglishAdverbsActionStudioAction,
  ];
};

export const ENGLISH_ADVERBS_ACTION_STUDIO_ROUNDS = [
  {
    id: 'race-day',
    accent: 'sky',
    tokens: ['fast', 'carefully', 'beautifully', 'happily', 'badly'],
    actions: [
      {
        id: 'race-day-run',
        actionId: 'run_race',
        answer: 'fast',
      },
      {
        id: 'race-day-paint',
        actionId: 'paint_picture',
        answer: 'beautifully',
      },
      {
        id: 'race-day-carry',
        actionId: 'carry_books',
        answer: 'carefully',
      },
    ],
  },
  {
    id: 'school-studio',
    accent: 'amber',
    tokens: ['well', 'happily', 'badly', 'fast', 'carefully'],
    actions: [
      {
        id: 'school-studio-football',
        actionId: 'play_football',
        answer: 'well',
      },
      {
        id: 'school-studio-dance',
        actionId: 'dance_show',
        answer: 'happily',
      },
      {
        id: 'school-studio-write',
        actionId: 'write_story',
        answer: 'badly',
      },
    ],
  },
  {
    id: 'talent-corner',
    accent: 'violet',
    tokens: ['beautifully', 'carefully', 'fast', 'well', 'badly'],
    actions: [
      {
        id: 'talent-corner-sing',
        actionId: 'sing_song',
        answer: 'beautifully',
      },
      {
        id: 'talent-corner-carry',
        actionId: 'carry_books',
        answer: 'carefully',
      },
      {
        id: 'talent-corner-run',
        actionId: 'run_race',
        answer: 'fast',
      },
    ],
  },
  {
    id: 'playground-show',
    accent: 'rose',
    tokens: ['badly', 'happily', 'well', 'beautifully', 'fast'],
    actions: [
      {
        id: 'playground-show-football',
        actionId: 'play_football',
        answer: 'badly',
      },
      {
        id: 'playground-show-dance',
        actionId: 'dance_show',
        answer: 'happily',
      },
      {
        id: 'playground-show-sing',
        actionId: 'sing_song',
        answer: 'well',
      },
    ],
  },
  {
    id: 'homework-club',
    accent: 'emerald',
    tokens: ['well', 'carefully', 'fast', 'beautifully', 'happily'],
    actions: [
      {
        id: 'homework-club-write',
        actionId: 'write_story',
        answer: 'well',
      },
      {
        id: 'homework-club-carry',
        actionId: 'carry_books',
        answer: 'carefully',
      },
      {
        id: 'homework-club-run',
        actionId: 'run_race',
        answer: 'fast',
      },
    ],
  },
] as const satisfies readonly EnglishAdverbsActionStudioRound[];
