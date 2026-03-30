import {
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import {
  type KangurMiniGameTranslate,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  ENGLISH_ADJECTIVES_SCENE_ROUNDS,
  type EnglishAdjectivePhraseId,
  type EnglishAdjectiveSceneObjectId,
  type EnglishAdjectivesSceneRound,
} from './EnglishAdjectivesSceneGame.data';
import type {
  SlottedRoundStateDto,
  SlottedRoundTokenExtractionDto,
} from './round-state-contracts';

export type AdjectiveToken = {
  id: string;
  adjective: EnglishAdjectivePhraseId;
};

export type RoundState = SlottedRoundStateDto<AdjectiveToken>;

export type AdjectiveTokenMeta = {
  accent: KangurAccent;
  emoji: string;
  focus: 'size_color' | 'texture' | 'color' | 'age' | 'opinion';
  fill?: string;
  scale?: number;
  stretchY?: number;
  sparkle?: boolean;
  soft?: boolean;
};

export const ADJECTIVE_TOKEN_META: Record<EnglishAdjectivePhraseId, AdjectiveTokenMeta> = {
  big_yellow: {
    accent: 'amber',
    emoji: '🌞',
    focus: 'size_color',
    fill: '#facc15',
    scale: 1.2,
    stretchY: 1.08,
  },
  soft: {
    accent: 'emerald',
    emoji: '☁️',
    focus: 'texture',
    fill: '#cbd5e1',
    soft: true,
  },
  long_blue: {
    accent: 'sky',
    emoji: '🪟',
    focus: 'size_color',
    fill: '#60a5fa',
    stretchY: 1.28,
  },
  red: {
    accent: 'rose',
    emoji: '🚂',
    focus: 'color',
    fill: '#ef4444',
  },
  small_red: {
    accent: 'rose',
    emoji: '🍎',
    focus: 'size_color',
    fill: '#f43f5e',
    scale: 0.84,
  },
  small_blue: {
    accent: 'sky',
    emoji: '🧸',
    focus: 'size_color',
    fill: '#60a5fa',
    scale: 0.84,
  },
  bright_green: {
    accent: 'emerald',
    emoji: '🟢',
    focus: 'color',
    fill: '#22c55e',
  },
  new: {
    accent: 'violet',
    emoji: '✨',
    focus: 'age',
    fill: '#ddd6fe',
    sparkle: true,
  },
  old: {
    accent: 'amber',
    emoji: '🕰️',
    focus: 'age',
    fill: '#a8a29e',
  },
  brown: {
    accent: 'amber',
    emoji: '🤎',
    focus: 'color',
    fill: '#8b5e3c',
  },
  long_black: {
    accent: 'slate',
    emoji: '🖤',
    focus: 'size_color',
    fill: '#111827',
    stretchY: 1.24,
  },
  beautiful: {
    accent: 'violet',
    emoji: '🌟',
    focus: 'opinion',
    fill: '#c084fc',
    sparkle: true,
  },
};

export const shuffle = <T,>(items: readonly T[]): T[] => [...items].sort(() => Math.random() - 0.5);

export const withIndefiniteArticle = (phrase: string): string =>
  /^[aeiou]/i.test(phrase.trim()) ? `an ${phrase}` : `a ${phrase}`;

export const buildRoundState = (round: EnglishAdjectivesSceneRound): RoundState => ({
  pool: shuffle(
    round.tokens.map((adjective, index) => ({
      id: `token-${round.id}-${index}-${adjective}`,
      adjective,
    }))
  ),
  slots: Object.fromEntries(round.objects.map((object) => [object.id, null])),
});

export const TOTAL_ROUNDS = ENGLISH_ADJECTIVES_SCENE_ROUNDS.length;
export const TOTAL_TARGETS = ENGLISH_ADJECTIVES_SCENE_ROUNDS.reduce(
  (sum, round) => sum + round.objects.length,
  0
);

export const getRoundTranslation = (
  translate: KangurMiniGameTranslate,
  roundId: EnglishAdjectivesSceneRound['id'],
  field: 'title' | 'prompt' | 'hint'
): string => translate(`englishAdjectives.inRound.scene.rounds.${roundId}.${field}`);

export const getTokenLabel = (
  translate: KangurMiniGameTranslate,
  adjective: EnglishAdjectivePhraseId
): string => translate(`englishAdjectives.inRound.scene.tokens.${adjective}`);

export const getObjectLabel = (
  translate: KangurMiniGameTranslate,
  objectId: EnglishAdjectiveSceneObjectId
): string => translate(`englishAdjectives.inRound.scene.objects.${objectId}`);

export const buildAdjectiveObjectPhrase = (
  translate: KangurMiniGameTranslate,
  adjective: EnglishAdjectivePhraseId,
  objectId: EnglishAdjectiveSceneObjectId
): string => `${getTokenLabel(translate, adjective)} ${getObjectLabel(translate, objectId)}`;

export const getAdjectiveFocusLabel = (
  translate: KangurMiniGameTranslate,
  adjective: EnglishAdjectivePhraseId
): string => translate(`englishAdjectives.inRound.scene.focus.${ADJECTIVE_TOKEN_META[adjective].focus}`);

export const getAdjectiveDescribePrompt = (
  translate: KangurMiniGameTranslate,
  objectId: EnglishAdjectiveSceneObjectId
): string =>
  translate('englishAdjectives.inRound.scene.describePrompt', {
    object: getObjectLabel(translate, objectId),
  });

export const buildAdjectiveObjectTemplate = (
  translate: KangurMiniGameTranslate,
  objectId: EnglishAdjectiveSceneObjectId
): string => `___ ${getObjectLabel(translate, objectId)}`;

export const buildAdjectiveObjectSentence = (
  translate: KangurMiniGameTranslate,
  adjective: EnglishAdjectivePhraseId,
  objectId: EnglishAdjectiveSceneObjectId
): string => {
  const phrase = buildAdjectiveObjectPhrase(translate, adjective, objectId);
  const phraseWithArticle = withIndefiniteArticle(phrase);

  switch (objectId) {
    case 'cupboard':
      return `There is ${phraseWithArticle} in the room.`;
    case 'curtains':
      return `There are ${phrase} on the window.`;
    case 'rug':
      return `There is ${phraseWithArticle} on the floor.`;
    case 'train':
      return `It is ${phraseWithArticle}.`;
    case 'teddy':
      return `It is ${phraseWithArticle}.`;
    case 'games':
      return `They are ${phrase}.`;
    case 'eyes':
      return `She has ${phrase}.`;
    case 'hair':
      return `She has ${phrase}.`;
    case 'picture':
      return `It is ${phraseWithArticle}.`;
    case 'desk':
      return `There is ${phraseWithArticle} by the wall.`;
    case 'lamp':
      return `There is ${phraseWithArticle} on the desk.`;
    case 'book':
      return `It is ${phraseWithArticle}.`;
    case 'slide':
      return `It is ${phraseWithArticle}.`;
    case 'kite':
      return `It is ${phraseWithArticle}.`;
    case 'bench':
      return `It is ${phraseWithArticle}.`;
    default:
      return phrase;
  }
};

export const buildAdjectiveObjectSentenceTemplate = (
  translate: KangurMiniGameTranslate,
  objectId: EnglishAdjectiveSceneObjectId
): string => {
  const phrase = buildAdjectiveObjectTemplate(translate, objectId);

  switch (objectId) {
    case 'cupboard':
      return `There is a ${phrase} in the room.`;
    case 'curtains':
      return `There are ${phrase} on the window.`;
    case 'rug':
      return `There is a ${phrase} on the floor.`;
    case 'train':
      return `It is a ${phrase}.`;
    case 'teddy':
      return `It is a ${phrase}.`;
    case 'games':
      return `They are ${phrase}.`;
    case 'eyes':
      return `She has ${phrase}.`;
    case 'hair':
      return `She has ${phrase}.`;
    case 'picture':
      return `It is a ${phrase}.`;
    case 'desk':
      return `There is a ${phrase} by the wall.`;
    case 'lamp':
      return `There is a ${phrase} on the desk.`;
    case 'book':
      return `It is a ${phrase}.`;
    case 'slide':
      return `It is a ${phrase}.`;
    case 'kite':
      return `It is a ${phrase}.`;
    case 'bench':
      return `It is a ${phrase}.`;
    default:
      return phrase;
  }
};

export const slotDroppableId = (slotId: string): string => `slot-${slotId}`;
export const isSlotDroppable = (value: string): boolean => value.startsWith('slot-');
export const getSlotIdFromDroppable = (value: string): string => value.replace('slot-', '');

export const takeTokenFromState = (
  state: RoundState,
  tokenId: string
): SlottedRoundTokenExtractionDto<AdjectiveToken> => {
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

export const countRoundCorrect = (round: EnglishAdjectivesSceneRound, state: RoundState): number =>
  round.objects.reduce((sum, object) => {
    return sum + (state.slots[object.id]?.adjective === object.answer ? 1 : 0);
  }, 0);
