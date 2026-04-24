import type { Href } from 'expo-router';
import type { KangurDuelMode, KangurDuelOperation, KangurDuelDifficulty, KangurDuelReactionType } from '@kangur/contracts/kangur-duels';
import type { KangurMobileLocalizedValue } from '../../i18n/kangurMobileI18n';

export const HOME_ROUTE = '/' as Href;
export const LESSONS_ROUTE = '/lessons' as Href;
export const PROFILE_ROUTE = '/profile' as Href;

export const LOBBY_CHAT_PREVIEW_LIMIT = 8;
export const AUTO_REFRESH_INTERVAL_MS = 15_000;

export const DUEL_MODE_LABELS: Record<KangurDuelMode, KangurMobileLocalizedValue<string>> = {
  challenge: { de: 'Herausforderung', en: 'Challenge', pl: 'Wyzwanie' },
  quick_match: { de: 'Schnelles Match', en: 'Quick match', pl: 'Szybki mecz' },
};

export const DUEL_OPERATION_SYMBOLS: Record<KangurDuelOperation, string> = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
};

export const DUEL_OPERATION_LABELS: Record<KangurDuelOperation, KangurMobileLocalizedValue<string>> = {
  addition: { de: 'Addition', en: 'Addition', pl: 'Dodawanie' },
  subtraction: { de: 'Subtraktion', en: 'Subtraction', pl: 'Odejmowanie' },
  multiplication: { de: 'Multiplikation', en: 'Multiplication', pl: 'Mnożenie' },
  division: { de: 'Division', en: 'Division', pl: 'Dzielenie' },
};

export const DUEL_DIFFICULTY_LABELS: Record<KangurDuelDifficulty, KangurMobileLocalizedValue<string>> = {
  easy: { de: 'Leicht', en: 'Easy', pl: 'Łatwy' },
  medium: { de: 'Mittel', en: 'Medium', pl: 'Średni' },
  hard: { de: 'Schwer', en: 'Hard', pl: 'Trudny' },
};

export const DUEL_DIFFICULTY_EMOJIS: Record<KangurDuelDifficulty, string> = {
  easy: '🟢',
  medium: '🟡',
  hard: '🔴',
};

export const SERIES_BEST_OF_OPTIONS: Array<1 | 3 | 5 | 7 | 9> = [1, 3, 5, 7, 9];

export const DUEL_REACTION_OPTIONS: KangurDuelReactionType[] = [
  'cheer', 'wow', 'gg', 'fire', 'clap', 'rocket', 'thumbs_up',
];

export const DUEL_REACTION_EMOJIS: Record<KangurDuelReactionType, string> = {
  cheer: '👏',
  wow: '😮',
  gg: '🤝',
  fire: '🔥',
  clap: '🙌',
  rocket: '🚀',
  thumbs_up: '👍',
};
