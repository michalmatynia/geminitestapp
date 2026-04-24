import type { KangurMobileLocale } from '../../i18n/kangurMobileI18n';
import type { 
    KangurDuelMode, KangurDuelOperation, KangurDuelDifficulty, KangurDuelStatus, 
    KangurDuelPlayerStatus, KangurDuelReactionType, KangurDuelSession, KangurDuelPlayer, KangurDuelSeries 
} from '@kangur/contracts/kangur-duels';
import type { KangurLobbyChatMessage } from '@kangur/contracts/kangur-duels-chat';
import * as Constants from './duels-constants';
import * as Formatters from './duels-formatters';

export const {
  DUEL_OPERATION_SYMBOLS,
  DUEL_OPERATION_LABELS,
  DUEL_DIFFICULTY_LABELS,
  DUEL_DIFFICULTY_EMOJIS,
  OPERATION_OPTIONS,
  DIFFICULTY_OPTIONS,
  SERIES_BEST_OF_OPTIONS,
} = Constants;

export function formatModeLabel(mode: KangurDuelMode, locale: KangurMobileLocale): string {
  return Formatters.localizeDuelText(Constants.DUEL_MODE_LABELS[mode], locale);
}

export function formatOperationLabel(
  operation: KangurDuelOperation,
  locale: KangurMobileLocale,
): string {
  return `${Constants.DUEL_OPERATION_SYMBOLS[operation]} ${Formatters.localizeDuelText(Constants.DUEL_OPERATION_LABELS[operation], locale)}`;
}

export function formatDifficultyLabel(
  difficulty: KangurDuelDifficulty,
  locale: KangurMobileLocale,
): string {
  return `${Constants.DUEL_DIFFICULTY_EMOJIS[difficulty]} ${Formatters.localizeDuelText(Constants.DUEL_DIFFICULTY_LABELS[difficulty], locale)}`;
}

export function formatReactionLabel(
  type: KangurDuelReactionType,
  locale: KangurMobileLocale,
): string {
  return `${Constants.DUEL_REACTION_EMOJIS[type]} ${Formatters.localizeDuelText(Constants.DUEL_REACTION_LABELS[type], locale)}`;
}

export function formatRelativeAge(isoString: string, locale: KangurMobileLocale): string {
  const parsed = Date.parse(isoString);
  if (!Number.isFinite(parsed)) return Formatters.localizeDuelText({ de: 'gerade eben', en: 'just now', pl: 'przed chwilą' }, locale);

  const seconds = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
  if (seconds < 10) return Formatters.localizeDuelText({ de: 'gerade eben', en: 'just now', pl: 'przed chwilą' }, locale);
  if (seconds < 60) return Formatters.localizeSimpleDuelText(`vor ${seconds}s`, `${seconds}s ago`, `${seconds}s temu`, locale);

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return Formatters.localizeSimpleDuelText(`vor ${minutes} Min.`, `${minutes} min ago`, `${minutes} min temu`, locale);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return Formatters.localizeSimpleDuelText(`vor ${hours} Std.`, `${hours} hr ago`, `${hours} godz. temu`, locale);
  const days = Math.floor(hours / 24);
  return Formatters.localizeSimpleDuelText(`vor ${days} Tagen`, `${days} days ago`, `${days} dni temu`, locale);
}

export function formatSeriesBestOfLabel(bestOf: 1 | 3 | 5 | 7 | 9, locale: KangurMobileLocale): string {
  if (bestOf === 1) return Formatters.localizeDuelText({ de: 'Einzelnes Match', en: 'Single match', pl: 'Pojedynczy mecz' }, locale);
  return Formatters.localizeDuelText({ de: `BO${bestOf}-Serie`, en: `BO${bestOf} series`, pl: `Seria BO${bestOf}` }, locale);
}

export function normalizeSeriesBestOf(bestOf: number | null | undefined): 1 | 3 | 5 | 7 | 9 {
  return (bestOf === 3 || bestOf === 5 || bestOf === 7 || bestOf === 9) ? bestOf : 1;
}

export function resolveSessionIdParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = typeof raw === 'string' ? raw.trim() : '';
  return normalized || null;
}

export function resolveSpectateParam(value: string | string[] | undefined): boolean {
  const normalized = (typeof value === 'string' ? value.trim() : Array.isArray(value) ? value[0]?.trim() : '').toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export function formatLobbyChatSenderLabel(message: KangurLobbyChatMessage, activeLearnerId: string | null, locale: KangurMobileLocale): string {
  return message.senderId === activeLearnerId ? Formatters.localizeDuelText({ de: 'Du', en: 'You', pl: 'Ty' }, locale) : message.senderName;
}
