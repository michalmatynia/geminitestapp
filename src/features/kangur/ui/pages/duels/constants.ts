import {
  KANGUR_DUELS_DEFAULT_LOBBY_LIMIT,
  KANGUR_DUELS_DEFAULT_OPPONENTS_LIMIT,
  KANGUR_DUELS_DEFAULT_SEARCH_LIMIT,
} from '@/features/kangur/shared/duels-config';
import {
  DUEL_DIFFICULTY_EMOJIS,
  DUEL_DIFFICULTY_LABELS,
  DUEL_OPERATION_LABELS,
  DUEL_OPERATION_SYMBOLS,
} from './duels-helpers';
import type {
  KangurDuelDifficulty,
  KangurDuelOperation,
  KangurDuelReactionType,
} from '@/features/kangur/shared/contracts/kangur-duels';

export const DUEL_POLL_INTERVAL_MS = 2500;
export const DUEL_POLL_MAX_INTERVAL_MS = 20_000;
export const DUEL_HEARTBEAT_INTERVAL_MS = 20_000;
export const LOBBY_POLL_INTERVAL_MS = 5000;
export const LOBBY_POLL_MAX_INTERVAL_MS = 30_000;
export const LOBBY_POLL_SAFETY_INTERVAL_MS = 30_000;
export const LOBBY_FRESH_WINDOW_MS = 15_000;
export const LOBBY_RELATIVE_TIME_TICK_MS = 10_000;
export const LOBBY_PRESENCE_POLL_INTERVAL_MS = 20_000;
export const DUEL_SPECTATOR_POLL_INTERVAL_MS = 4000;
export const DUEL_LEADERBOARD_LIMIT = 8;
export const DUEL_TIMEOUT_CHOICE = '__timeout__';
export const DUEL_SEARCH_DEBOUNCE_MS = 300;
export const LOBBY_STREAM_DEBOUNCE_MS = 600;

export {
  KANGUR_DUELS_DEFAULT_LOBBY_LIMIT,
  KANGUR_DUELS_DEFAULT_OPPONENTS_LIMIT,
  KANGUR_DUELS_DEFAULT_SEARCH_LIMIT,
};

export const MOTION_PANEL_CLASSNAME =
  'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:ease-out';
export const MOTION_ENTRY_CLASSNAME =
  'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:ease-out';

export const DUEL_QUESTION_COUNT_OPTIONS = [3, 5, 8, 10, 12, 15, 20] as const;
export const DUEL_TIME_PER_QUESTION_OPTIONS = [5, 10, 15, 20, 30, 45, 60] as const;
export const DUEL_BEST_OF_OPTIONS = [1, 3, 5, 7] as const;

export const DUEL_OPERATION_OPTIONS: Array<{
  value: KangurDuelOperation;
  label: string;
  symbol: string;
}> = [
  { value: 'addition', label: DUEL_OPERATION_LABELS.addition, symbol: DUEL_OPERATION_SYMBOLS.addition },
  { value: 'subtraction', label: DUEL_OPERATION_LABELS.subtraction, symbol: DUEL_OPERATION_SYMBOLS.subtraction },
  { value: 'multiplication', label: DUEL_OPERATION_LABELS.multiplication, symbol: DUEL_OPERATION_SYMBOLS.multiplication },
  { value: 'division', label: DUEL_OPERATION_LABELS.division, symbol: DUEL_OPERATION_SYMBOLS.division },
];

export const DUEL_DIFFICULTY_OPTIONS: Array<{
  value: KangurDuelDifficulty;
  label: string;
  emoji: string;
}> = [
  { value: 'easy', label: DUEL_DIFFICULTY_LABELS.easy, emoji: DUEL_DIFFICULTY_EMOJIS.easy },
  { value: 'medium', label: DUEL_DIFFICULTY_LABELS.medium, emoji: DUEL_DIFFICULTY_EMOJIS.medium },
  { value: 'hard', label: DUEL_DIFFICULTY_LABELS.hard, emoji: DUEL_DIFFICULTY_EMOJIS.hard },
];

export const DUEL_OPERATION_VALUES = new Set<KangurDuelOperation>(
  DUEL_OPERATION_OPTIONS.map((option) => option.value)
);
export const DUEL_DIFFICULTY_VALUES = new Set<KangurDuelDifficulty>(
  DUEL_DIFFICULTY_OPTIONS.map((option) => option.value)
);

export const DUEL_REACTION_OPTIONS: Array<{
  type: KangurDuelReactionType;
  label: string;
  ariaLabel: string;
}> = [
  { type: 'cheer', label: '👏', ariaLabel: 'Brawa' },
  { type: 'wow', label: '😮', ariaLabel: 'Wow' },
  { type: 'gg', label: '🤝', ariaLabel: 'Dobra gra' },
  { type: 'fire', label: '🔥', ariaLabel: 'Ogień' },
  { type: 'clap', label: '🙌', ariaLabel: 'Super' },
  { type: 'rocket', label: '🚀', ariaLabel: 'Rakieta' },
  { type: 'thumbs_up', label: '👍', ariaLabel: 'Kciuk w górę' },
] as const;
