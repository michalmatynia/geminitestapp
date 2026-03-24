import type { KangurAccent } from '@/features/kangur/ui/design/tokens';

export type EnglishAdjectivePhraseId =
  | 'big_yellow'
  | 'soft'
  | 'long_blue'
  | 'red'
  | 'small_red'
  | 'small_blue'
  | 'bright_green'
  | 'new'
  | 'old'
  | 'brown'
  | 'long_black'
  | 'beautiful';

export type EnglishAdjectiveSceneId =
  | 'bedroom'
  | 'toy_shelf'
  | 'portrait'
  | 'study_corner'
  | 'playground';

export type EnglishAdjectiveSceneObjectId =
  | 'cupboard'
  | 'curtains'
  | 'rug'
  | 'train'
  | 'teddy'
  | 'games'
  | 'eyes'
  | 'hair'
  | 'picture'
  | 'desk'
  | 'lamp'
  | 'book'
  | 'slide'
  | 'kite'
  | 'bench';

export type EnglishAdjectivesSceneRound = {
  id: EnglishAdjectiveSceneId;
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
    id: 'study_corner',
    accent: 'emerald',
    scene: 'study_corner',
    tokens: ['small_red', 'new', 'bright_green', 'beautiful', 'soft'],
    objects: [
      {
        id: 'study-corner-desk',
        objectId: 'desk',
        answer: 'new',
      },
      {
        id: 'study-corner-lamp',
        objectId: 'lamp',
        answer: 'small_red',
      },
      {
        id: 'study-corner-book',
        objectId: 'book',
        answer: 'bright_green',
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
  {
    id: 'playground',
    accent: 'rose',
    scene: 'playground',
    tokens: ['big_yellow', 'long_blue', 'old', 'red', 'beautiful'],
    objects: [
      {
        id: 'playground-slide',
        objectId: 'slide',
        answer: 'big_yellow',
      },
      {
        id: 'playground-kite',
        objectId: 'kite',
        answer: 'long_blue',
      },
      {
        id: 'playground-bench',
        objectId: 'bench',
        answer: 'old',
      },
    ],
  },
] as const satisfies readonly EnglishAdjectivesSceneRound[];
