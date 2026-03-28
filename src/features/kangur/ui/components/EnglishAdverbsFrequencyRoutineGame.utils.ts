import {
  KANGUR_ACCENT_STYLES,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import {
  type KangurMiniGameTranslate,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  ENGLISH_ADVERBS_FREQUENCY_ROUTINE_ROUNDS,
  type EnglishAdverbFrequencyActionId,
  type EnglishAdverbFrequencyId,
  type EnglishAdverbsFrequencyRoutineRound,
} from './EnglishAdverbsFrequencyRoutineGame.data';
import type {
  SlottedRoundStateDto,
  SlottedRoundTokenExtractionDto,
} from './round-state-contracts';

export type FrequencyToken = {
  id: string;
  frequency: EnglishAdverbFrequencyId;
};

export type RoundState = SlottedRoundStateDto<FrequencyToken>;

export type FrequencyMeta = {
  accent: KangurAccent;
  emoji: string;
  activeDays: boolean[];
  fill: string;
};

export const FREQUENCY_META: Record<EnglishAdverbFrequencyId, FrequencyMeta> = {
  always: {
    accent: 'emerald',
    emoji: '🟢',
    activeDays: [true, true, true, true, true, true, true],
    fill: '#22c55e',
  },
  usually: {
    accent: 'sky',
    emoji: '🔵',
    activeDays: [true, true, true, false, true, true, true],
    fill: '#38bdf8',
  },
  sometimes: {
    accent: 'amber',
    emoji: '🟡',
    activeDays: [true, false, false, true, false, false, true],
    fill: '#f59e0b',
  },
  never: {
    accent: 'rose',
    emoji: '⚪',
    activeDays: [false, false, false, false, false, false, false],
    fill: '#fda4af',
  },
};

export const ACTION_META: Record<EnglishAdverbFrequencyActionId, { emoji: string }> = {
  go_to_cinema: { emoji: '🎬' },
  go_with_friends: { emoji: '🧑‍🤝‍🧑' },
  eat_popcorn: { emoji: '🍿' },
  do_homework: { emoji: '📚' },
  get_up_at_seven: { emoji: '⏰' },
  be_late_for_school: { emoji: '🏫' },
  go_to_park: { emoji: '🌳' },
  watch_tv: { emoji: '📺' },
  go_swimming: { emoji: '🏊' },
};

export const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

export const shuffle = <T,>(items: readonly T[]): T[] => [...items].sort(() => Math.random() - 0.5);

export const buildRoundState = (round: EnglishAdverbsFrequencyRoutineRound): RoundState => ({
  pool: shuffle(
    (Object.keys(FREQUENCY_META) as EnglishAdverbFrequencyId[]).map((frequency) => ({
      id: `token-${round.id}-${frequency}`,
      frequency,
    }))
  ),
  slots: Object.fromEntries(round.actions.map((action) => [action.id, null])),
});

export const TOTAL_ROUNDS = ENGLISH_ADVERBS_FREQUENCY_ROUTINE_ROUNDS.length;
export const TOTAL_ACTIONS = ENGLISH_ADVERBS_FREQUENCY_ROUTINE_ROUNDS.reduce(
  (sum, round) => sum + round.actions.length,
  0
);

export const getRoundTranslation = (
  translate: KangurMiniGameTranslate,
  roundId: EnglishAdverbsFrequencyRoutineRound['id'],
  field: 'title' | 'prompt' | 'hint'
): string => translate(`englishAdverbsFrequency.inRound.studio.rounds.${roundId}.${field}`);

export const getFrequencyLabel = (
  translate: KangurMiniGameTranslate,
  frequency: EnglishAdverbFrequencyId
): string => translate(`englishAdverbsFrequency.inRound.studio.frequencies.${frequency}.label`);

export const getFrequencyDescription = (
  translate: KangurMiniGameTranslate,
  frequency: EnglishAdverbFrequencyId
): string =>
  translate(`englishAdverbsFrequency.inRound.studio.frequencies.${frequency}.description`);

export const countFrequencyActiveDays = (frequency: EnglishAdverbFrequencyId): number =>
  FREQUENCY_META[frequency].activeDays.filter(Boolean).length;

export const getFrequencyDaysLitLabel = (
  translate: KangurMiniGameTranslate,
  frequency: EnglishAdverbFrequencyId
): string =>
  `${translate('englishAdverbsFrequency.inRound.studio.daysLitLabel')}: ${countFrequencyActiveDays(
    frequency
  )}/7`;

export const getActionLabel = (
  translate: KangurMiniGameTranslate,
  actionId: EnglishAdverbFrequencyActionId
): string => translate(`englishAdverbsFrequency.inRound.studio.actions.${actionId}`);

export const slotDroppableId = (slotId: string): string => `slot-${slotId}`;
export const isSlotDroppable = (value: string): boolean => value.startsWith('slot-');
export const getSlotIdFromDroppable = (value: string): string => value.replace('slot-', '');

export const moveWithinList = <T,>(items: T[], from: number, to: number): T[] => {
  const updated = [...items];
  const [moved] = updated.splice(from, 1);
  if (moved === undefined) return updated;
  updated.splice(to, 0, moved);
  return updated;
};

export const takeTokenFromState = (
  state: RoundState,
  tokenId: string
): SlottedRoundTokenExtractionDto<FrequencyToken> => {
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
  round: EnglishAdverbsFrequencyRoutineRound,
  state: RoundState
): number =>
  round.actions.reduce((sum, action) => {
    return sum + (state.slots[action.id]?.frequency === action.answer ? 1 : 0);
  }, 0);
