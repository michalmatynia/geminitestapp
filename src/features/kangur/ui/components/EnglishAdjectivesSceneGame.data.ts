import type { KangurAccent } from '@/features/kangur/ui/design/tokens';

export type EnglishAdjectivePhraseId =
  | 'big_yellow'
  | 'soft'
  | 'long_blue'
  | 'red'
  | 'small_blue'
  | 'new'
  | 'brown'
  | 'long_black'
  | 'beautiful';

export type EnglishAdjectiveSceneId = 'bedroom' | 'toy_shelf' | 'portrait';

export type EnglishAdjectiveSceneObjectId =
  | 'cupboard'
  | 'curtains'
  | 'rug'
  | 'train'
  | 'teddy'
  | 'games'
  | 'eyes'
  | 'hair'
  | 'picture';

export type EnglishAdjectivesSceneRound = {
  id: 'bedroom' | 'toy_shelf' | 'portrait';
  accent: KangurAccent;
  scene: EnglishAdjectiveSceneId;
  tokens: readonly EnglishAdjectivePhraseId[];
  objects: readonly [
    {
      id: string;
      objectId: EnglishAdjectiveSceneObjectId;
      answer: EnglishAdjectivePhraseId;
    },
    {
      id: string;
      objectId: EnglishAdjectiveSceneObjectId;
      answer: EnglishAdjectivePhraseId;
    },
    {
      id: string;
      objectId: EnglishAdjectiveSceneObjectId;
      answer: EnglishAdjectivePhraseId;
    },
  ];
};

export const ENGLISH_ADJECTIVES_SCENE_ROUNDS = [
  {
    id: 'bedroom',
    accent: 'amber',
    scene: 'bedroom',
    tokens: ['big_yellow', 'soft', 'long_blue', 'red', 'beautiful'],
    objects: [
      {
        id: 'bedroom-cupboard',
        objectId: 'cupboard',
        answer: 'big_yellow',
      },
      {
        id: 'bedroom-curtains',
        objectId: 'curtains',
        answer: 'long_blue',
      },
      {
        id: 'bedroom-rug',
        objectId: 'rug',
        answer: 'soft',
      },
    ],
  },
  {
    id: 'toy_shelf',
    accent: 'sky',
    scene: 'toy_shelf',
    tokens: ['red', 'small_blue', 'new', 'brown', 'soft'],
    objects: [
      {
        id: 'toy-shelf-train',
        objectId: 'train',
        answer: 'red',
      },
      {
        id: 'toy-shelf-teddy',
        objectId: 'teddy',
        answer: 'small_blue',
      },
      {
        id: 'toy-shelf-games',
        objectId: 'games',
        answer: 'new',
      },
    ],
  },
  {
    id: 'portrait',
    accent: 'violet',
    scene: 'portrait',
    tokens: ['brown', 'long_black', 'beautiful', 'new', 'big_yellow'],
    objects: [
      {
        id: 'portrait-eyes',
        objectId: 'eyes',
        answer: 'brown',
      },
      {
        id: 'portrait-hair',
        objectId: 'hair',
        answer: 'long_black',
      },
      {
        id: 'portrait-picture',
        objectId: 'picture',
        answer: 'beautiful',
      },
    ],
  },
] as const satisfies readonly EnglishAdjectivesSceneRound[];
