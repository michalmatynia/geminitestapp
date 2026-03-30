import type { KangurAccent } from '@/features/kangur/ui/design/tokens';

export type EnglishAdverbFrequencyId = 'always' | 'usually' | 'sometimes' | 'never';

export type EnglishAdverbFrequencyActionId =
  | 'go_to_cinema'
  | 'go_with_friends'
  | 'eat_popcorn'
  | 'do_homework'
  | 'get_up_at_seven'
  | 'be_late_for_school'
  | 'go_to_park'
  | 'watch_tv'
  | 'go_swimming';

type EnglishAdverbsFrequencyRoutineAction = {
  id: string;
  actionId: EnglishAdverbFrequencyActionId;
  answer: EnglishAdverbFrequencyId;
};

export type EnglishAdverbsFrequencyRoutineRound = {
  id: 'cinema-sunday' | 'school-week' | 'weekend-club' | 'after-school' | 'morning-check';
  accent: KangurAccent;
  actions: readonly [
    EnglishAdverbsFrequencyRoutineAction,
    EnglishAdverbsFrequencyRoutineAction,
    EnglishAdverbsFrequencyRoutineAction,
  ];
};

export const ENGLISH_ADVERBS_FREQUENCY_ROUTINE_ROUNDS = [
  {
    id: 'cinema-sunday',
    accent: 'amber',
    actions: [
      {
        id: 'cinema-sunday-cinema',
        actionId: 'go_to_cinema',
        answer: 'always',
      },
      {
        id: 'cinema-sunday-friends',
        actionId: 'go_with_friends',
        answer: 'usually',
      },
      {
        id: 'cinema-sunday-popcorn',
        actionId: 'eat_popcorn',
        answer: 'never',
      },
    ],
  },
  {
    id: 'school-week',
    accent: 'sky',
    actions: [
      {
        id: 'school-week-homework',
        actionId: 'do_homework',
        answer: 'always',
      },
      {
        id: 'school-week-seven',
        actionId: 'get_up_at_seven',
        answer: 'usually',
      },
      {
        id: 'school-week-late',
        actionId: 'be_late_for_school',
        answer: 'never',
      },
    ],
  },
  {
    id: 'weekend-club',
    accent: 'violet',
    actions: [
      {
        id: 'weekend-club-park',
        actionId: 'go_to_park',
        answer: 'always',
      },
      {
        id: 'weekend-club-tv',
        actionId: 'watch_tv',
        answer: 'sometimes',
      },
      {
        id: 'weekend-club-swimming',
        actionId: 'go_swimming',
        answer: 'never',
      },
    ],
  },
  {
    id: 'after-school',
    accent: 'emerald',
    actions: [
      {
        id: 'after-school-homework',
        actionId: 'do_homework',
        answer: 'always',
      },
      {
        id: 'after-school-park',
        actionId: 'go_to_park',
        answer: 'sometimes',
      },
      {
        id: 'after-school-swimming',
        actionId: 'go_swimming',
        answer: 'never',
      },
    ],
  },
  {
    id: 'morning-check',
    accent: 'rose',
    actions: [
      {
        id: 'morning-check-seven',
        actionId: 'get_up_at_seven',
        answer: 'usually',
      },
      {
        id: 'morning-check-late',
        actionId: 'be_late_for_school',
        answer: 'never',
      },
      {
        id: 'morning-check-tv',
        actionId: 'watch_tv',
        answer: 'sometimes',
      },
    ],
  },
] as const satisfies readonly EnglishAdverbsFrequencyRoutineRound[];
