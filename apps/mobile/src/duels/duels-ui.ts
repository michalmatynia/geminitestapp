import type { KangurDuelDifficulty, KangurDuelMode, KangurDuelOperation, KangurDuelPlayer, KangurDuelPlayerStatus, KangurDuelReactionType, KangurDuelSeries, KangurDuelSession, KangurDuelStatus } from '@kangur/contracts/kangur-duels';
import type { KangurDuelLobbyChatMessage } from '@kangur/contracts/kangur-duels-chat';
import type { Href } from 'expo-router';
import { isStringNotEmpty } from './utils/duels-guards';
import type { KangurMobileLocale, KangurMobileLocalizedValue } from '../i18n/kangurMobileI18n';
import type { KangurMobileTone as Tone } from '../shared/KangurMobileUi';
import * as Constants from './utils/duels-constants';
import * as Formatters from './utils/duels-formatters';
import * as Status from './utils/duels-status';

export const HOME_ROUTE = '/' as Href;
export const LESSONS_ROUTE = '/lessons' as Href;
export const PROFILE_ROUTE = '/profile' as Href;

export const {
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
} = Constants;

export const {
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
} = Formatters;

export const {
  getLessonMasteryTone,
  getPlayerStatusTone,
  getStatusTone,
  isWaitingSessionStatus,
  resolveRoundProgress,
} = Status;

export const {
  localizeDuelText,
  normalizeSeriesBestOf,
} = Formatters;

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
