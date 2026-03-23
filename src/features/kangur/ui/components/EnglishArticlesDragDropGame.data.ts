import type { KangurAccent } from '@/features/kangur/ui/design/tokens';

export type EnglishArticleId = 'a' | 'an' | 'the';

export type EnglishArticlesDragDropSentence = {
  id: string;
  before: string;
  after: string;
  answer: EnglishArticleId;
};

export type EnglishArticlesDragDropRound = {
  id: string;
  accent: KangurAccent;
  sentences: readonly [EnglishArticlesDragDropSentence, EnglishArticlesDragDropSentence, EnglishArticlesDragDropSentence];
};

export const ENGLISH_ARTICLES_DRAG_DROP_ROUNDS = [
  {
    id: 'school-bag',
    accent: 'amber',
    sentences: [
      {
        id: 'school-bag-book',
        before: 'I need',
        after: 'notebook for English class.',
        answer: 'a',
      },
      {
        id: 'school-bag-eraser',
        before: 'She has',
        after: 'eraser in her pencil case.',
        answer: 'an',
      },
      {
        id: 'school-bag-window',
        before: 'Please close',
        after: 'window next to the board.',
        answer: 'the',
      },
    ],
  },
  {
    id: 'zoo-day',
    accent: 'rose',
    sentences: [
      {
        id: 'zoo-day-postcard',
        before: 'He bought',
        after: 'postcard from the gift shop.',
        answer: 'a',
      },
      {
        id: 'zoo-day-elephant',
        before: 'We saw',
        after: 'elephant at the zoo.',
        answer: 'an',
      },
      {
        id: 'zoo-day-gate',
        before: 'The guide opened',
        after: 'gate to the farm.',
        answer: 'the',
      },
    ],
  },
  {
    id: 'sound-detective',
    accent: 'violet',
    sentences: [
      {
        id: 'sound-detective-unicorn',
        before: 'He drew',
        after: 'unicorn in his sketchbook.',
        answer: 'a',
      },
      {
        id: 'sound-detective-hour',
        before: 'It takes',
        after: 'hour to get there.',
        answer: 'an',
      },
      {
        id: 'sound-detective-kitchen',
        before: 'We cleaned',
        after: 'kitchen after dinner.',
        answer: 'the',
      },
    ],
  },
  {
    id: 'trip-day',
    accent: 'sky',
    sentences: [
      {
        id: 'trip-day-camera',
        before: 'I borrowed',
        after: 'camera from my cousin.',
        answer: 'a',
      },
      {
        id: 'trip-day-umbrella',
        before: 'They packed',
        after: 'umbrella for the rain.',
        answer: 'an',
      },
      {
        id: 'trip-day-driver',
        before: 'She sat near',
        after: 'driver on the bus.',
        answer: 'the',
      },
    ],
  },
  {
    id: 'museum-day',
    accent: 'indigo',
    sentences: [
      {
        id: 'museum-day-guidebook',
        before: 'I bought',
        after: 'guidebook at the museum.',
        answer: 'a',
      },
      {
        id: 'museum-day-audio',
        before: 'Dad used',
        after: 'audio guide for the dinosaur room.',
        answer: 'an',
      },
      {
        id: 'museum-day-entrance',
        before: 'Please wait by',
        after: 'entrance near the big clock.',
        answer: 'the',
      },
    ],
  },
  {
    id: 'picnic-time',
    accent: 'emerald',
    sentences: [
      {
        id: 'picnic-time-sandwich',
        before: 'I made',
        after: 'sandwich for the picnic.',
        answer: 'a',
      },
      {
        id: 'picnic-time-apple',
        before: 'She cut',
        after: 'apple for snack time.',
        answer: 'an',
      },
      {
        id: 'picnic-time-basket',
        before: 'Please open',
        after: 'basket on the blanket.',
        answer: 'the',
      },
    ],
  },
] as const satisfies readonly EnglishArticlesDragDropRound[];
