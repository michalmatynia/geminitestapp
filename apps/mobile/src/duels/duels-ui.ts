import type { KangurDuelDifficulty, KangurDuelMode, KangurDuelOperation, KangurDuelPlayer, KangurDuelPlayerStatus, KangurDuelReactionType, KangurDuelSeries, KangurDuelSession, KangurDuelStatus } from '@kangur/contracts/kangur-duels';
import type { KangurDuelLobbyChatMessage } from '@kangur/contracts/kangur-duels-chat';
import type { Href } from 'expo-router';
import { isStringNotEmpty } from './utils/duels-guards';

export const HOME_ROUTE = '/' as Href;
export const LESSONS_ROUTE = '/lessons' as Href;
export const PROFILE_ROUTE = '/profile' as Href;

export {
  DUEL_MODE_LABELS,
  DUEL_OPERATION_SYMBOLS,
  DUEL_OPERATION_LABELS,
  DUEL_DIFFICULTY_LABELS,
  DUEL_DIFFICULTY_EMOJIS,
  DUEL_STATUS_LABELS,
  DUEL_PLAYER_STATUS_LABELS,
  MODE_FILTER_OPTIONS,
  OPERATION_OPTIONS,
  DIFFICULTY_OPTIONS,
  SERIES_BEST_OF_OPTIONS,
  DUEL_REACTION_OPTIONS,
  LOBBY_CHAT_PREVIEW_LIMIT,
  AUTO_REFRESH_INTERVAL_MS,
  DUEL_REACTION_EMOJIS,
  DUEL_REACTION_LABELS,
} from './utils/duels-constants';

export {
  formatLobbyChatSenderLabel,
  formatPlayerStatusLabel,
  formatQuestionProgress,
  formatReactionLabel,
  formatRoundProgressLabel,
  formatSeriesBestOfLabel,
  formatSeriesProgress,
  formatSeriesSummary,
  formatSeriesTitle,
  formatSpectatorQuestionProgress,
  formatStatusLabel,
  formatDifficultyLabel,
  formatOperationLabel,
  formatModeLabel,
  resolveSeriesWins,
  resolveWinnerSummary,
  formatRelativeAge,
  localizeDuelText,
  normalizeSeriesBestOf,
} from './utils/duels-formatters';

export {
  getLessonMasteryTone,
  getPlayerStatusTone,
  getStatusTone,
  isWaitingSessionStatus,
  resolveRoundProgress,
} from './utils/duels-status';

export function resolveSessionIdParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = typeof raw === 'string' ? raw.trim() : '';
  return isStringNotEmpty(normalized) ? normalized : null;
}

export function resolveSpectateParam(value: string | string[] | undefined): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}
