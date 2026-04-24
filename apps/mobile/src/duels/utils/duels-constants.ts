import type { Href } from 'expo-router';
import type { 
  KangurDuelMode, 
  KangurDuelOperation, 
  KangurDuelDifficulty, 
  KangurDuelStatus, 
  KangurDuelPlayerStatus, 
  KangurDuelReactionType 
} from '@kangur/contracts/kangur-duels';
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

export const DUEL_STATUS_LABELS: Record<KangurDuelStatus, KangurMobileLocalizedValue<string>> = {
  aborted: { de: 'Abgebrochen', en: 'Aborted', pl: 'Przerwany' },
  completed: { de: 'Beendet', en: 'Completed', pl: 'Zakończony' },
  created: { de: 'Erstellt', en: 'Created', pl: 'Utworzony' },
  in_progress: { de: 'Läuft', en: 'In progress', pl: 'W trakcie' },
  ready: { de: 'Bereit', en: 'Ready', pl: 'Gotowy' },
  waiting: { de: 'Warten', en: 'Waiting', pl: 'Oczekiwanie' },
};

export const DUEL_PLAYER_STATUS_LABELS: Record<KangurDuelPlayerStatus, KangurMobileLocalizedValue<string>> = {
  completed: { de: 'Fertig', en: 'Completed', pl: 'Ukończono' },
  invited: { de: 'Eingeladen', en: 'Invited', pl: 'Zaproszony' },
  left: { de: 'Verlassen', en: 'Left', pl: 'Wyszedł' },
  playing: { de: 'Spielt', en: 'Playing', pl: 'Gra' },
  ready: { de: 'Bereit', en: 'Ready', pl: 'Gotowy' },
};

export const MODE_FILTER_OPTIONS: readonly { value: 'all' | KangurDuelMode; label: KangurMobileLocalizedValue<string> }[] = [
  { value: 'all', label: { de: 'Alle', en: 'All', pl: 'Wszystkie' } },
  { value: 'quick_match', label: { de: 'Schnelle Matches', en: 'Quick matches', pl: 'Szybkie mecze' } },
  { value: 'challenge', label: { de: 'Herausforderungen', en: 'Challenges', pl: 'Wyzwania' } },
];

export const OPERATION_OPTIONS: KangurDuelOperation[] = ['addition', 'subtraction', 'multiplication', 'division'];
export const DIFFICULTY_OPTIONS: KangurDuelDifficulty[] = ['easy', 'medium', 'hard'];
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

export const DUEL_REACTION_LABELS: Record<KangurDuelReactionType, KangurMobileLocalizedValue<string>> = {
  cheer: { de: 'Applaus', en: 'Cheer', pl: 'Brawa' },
  wow: { de: 'Wow', en: 'Wow', pl: 'Wow' },
  gg: { de: 'Gutes Spiel', en: 'Good game', pl: 'Dobra gra' },
  fire: { de: 'Feuer', en: 'Fire', pl: 'Ogień' },
  clap: { de: 'Super', en: 'Nice', pl: 'Super' },
  rocket: { de: 'Rakete', en: 'Rocket', pl: 'Rakieta' },
  thumbs_up: { de: 'Daumen hoch', en: 'Thumbs up', pl: 'Kciuk w górę' },
};
