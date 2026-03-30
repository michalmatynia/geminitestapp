import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import type { KangurMiniGameTranslate } from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  ENGLISH_ADVERBS_ACTION_STUDIO_ROUNDS,
  type EnglishAdverbActionId,
  type EnglishAdverbId,
} from './EnglishAdverbsActionStudioGame.data';
import type {
  SlottedRoundStateDto,
  SlottedRoundTokenExtractionDto,
} from './round-state-contracts';

export type AdverbToken = {
  id: string;
  adverb: EnglishAdverbId;
};

export type RoundState = SlottedRoundStateDto<AdverbToken>;
type EnglishAdverbsActionStudioRound =
  (typeof ENGLISH_ADVERBS_ACTION_STUDIO_ROUNDS)[number];

export type AdverbTokenMeta = {
  accent: KangurAccent;
  emoji: string;
  fill: string;
  effect: 'speed' | 'care' | 'beauty' | 'joy' | 'skill' | 'mistake';
};

export const ADVERB_TOKEN_META: Record<EnglishAdverbId, AdverbTokenMeta> = {
  fast: {
    accent: 'sky',
    emoji: '💨',
    fill: '#38bdf8',
    effect: 'speed',
  },
  carefully: {
    accent: 'emerald',
    emoji: '🫶',
    fill: '#22c55e',
    effect: 'care',
  },
  beautifully: {
    accent: 'violet',
    emoji: '✨',
    fill: '#c084fc',
    effect: 'beauty',
  },
  happily: {
    accent: 'amber',
    emoji: '😊',
    fill: '#f59e0b',
    effect: 'joy',
  },
  well: {
    accent: 'emerald',
    emoji: '⭐',
    fill: '#10b981',
    effect: 'skill',
  },
  badly: {
    accent: 'rose',
    emoji: '💥',
    fill: '#fb7185',
    effect: 'mistake',
  },
};

export const ACTION_META: Record<EnglishAdverbActionId, { emoji: string }> = {
  run_race: { emoji: '🏃' },
  paint_picture: { emoji: '🎨' },
  carry_books: { emoji: '📚' },
  play_football: { emoji: '⚽' },
  write_story: { emoji: '✍️' },
  sing_song: { emoji: '🎤' },
  dance_show: { emoji: '💃' },
};

export const shuffle = <T,>(items: readonly T[]): T[] => [...items].sort(() => Math.random() - 0.5);

export const buildRoundState = (round: EnglishAdverbsActionStudioRound): RoundState => ({
  pool: shuffle(
    round.tokens.map((adverb, index) => ({
      id: `token-${round.id}-${index}-${adverb}`,
      adverb,
    }))
  ),
  slots: Object.fromEntries(round.actions.map((action) => [action.id, null])),
});

export const TOTAL_ROUNDS = ENGLISH_ADVERBS_ACTION_STUDIO_ROUNDS.length;
export const TOTAL_ACTIONS = ENGLISH_ADVERBS_ACTION_STUDIO_ROUNDS.reduce(
  (sum, round) => sum + round.actions.length,
  0
);

export const getRoundTranslation = (
  translate: KangurMiniGameTranslate,
  roundId: EnglishAdverbsActionStudioRound['id'],
  field: 'title' | 'prompt' | 'hint'
): string => translate(`englishAdverbs.inRound.studio.rounds.${roundId}.${field}`);

export const getAdverbLabel = (
  translate: KangurMiniGameTranslate,
  adverb: EnglishAdverbId
): string => translate(`englishAdverbs.inRound.studio.adverbs.${adverb}.label`);

export const getAdverbDescription = (
  translate: KangurMiniGameTranslate,
  adverb: EnglishAdverbId
): string => translate(`englishAdverbs.inRound.studio.adverbs.${adverb}.description`);

export const getActionLabel = (
  translate: KangurMiniGameTranslate,
  actionId: EnglishAdverbActionId
): string => translate(`englishAdverbs.inRound.studio.actions.${actionId}`);

export const getStyleChangeLabel = (
  translate: KangurMiniGameTranslate,
  adverb: EnglishAdverbId
): string => translate(`englishAdverbs.inRound.studio.styleChanges.${ADVERB_TOKEN_META[adverb].effect}`);

export const slotDroppableId = (slotId: string): string => `slot-${slotId}`;
export const isSlotDroppable = (value: string): boolean => value.startsWith('slot-');
export const getSlotIdFromDroppable = (value: string): string => value.replace('slot-', '');

export const takeTokenFromState = (
  state: RoundState,
  tokenId: string
): SlottedRoundTokenExtractionDto<AdverbToken> => {
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

export const countRoundCorrect = (
  round: EnglishAdverbsActionStudioRound,
  state: RoundState
): number =>
  round.actions.reduce((sum, action) => {
    return sum + (state.slots[action.id]?.adverb === action.answer ? 1 : 0);
  }, 0);

export const buildEnglishAdverbSentenceTemplate = (
  actionId: EnglishAdverbActionId
): string => {
  switch (actionId) {
    case 'run_race':
      return 'He runs ___.';
    case 'paint_picture':
      return 'She paints ___.';
    case 'carry_books':
      return 'He carries the books ___.';
    case 'play_football':
      return 'She plays football ___.';
    case 'write_story':
      return 'He writes the story ___.';
    case 'sing_song':
      return 'She sings ___.';
    case 'dance_show':
      return 'They dance ___.';
  }
};

export const buildEnglishAdverbSentence = (
  actionId: EnglishAdverbActionId,
  adverb: EnglishAdverbId
): string => {
  switch (actionId) {
    case 'run_race':
      return `He runs ${adverb}.`;
    case 'paint_picture':
      return `She paints ${adverb}.`;
    case 'carry_books':
      return `He carries the books ${adverb}.`;
    case 'play_football':
      return `She plays football ${adverb}.`;
    case 'write_story':
      return `He writes the story ${adverb}.`;
    case 'sing_song':
      return `She sings ${adverb}.`;
    case 'dance_show':
      return `They dance ${adverb}.`;
  }
};
