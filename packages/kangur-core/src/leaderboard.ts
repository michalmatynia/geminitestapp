import type { KangurScore } from '@kangur/contracts';

import { localizeKangurCoreText, type KangurCoreLocale } from './profile-i18n';

const MEDALS = ['🥇', '🥈', '🥉'] as const;

export type KangurLeaderboardUserFilter = 'all' | 'registered' | 'anonymous';
export type KangurLeaderboardUserFilterIcon = 'ghost' | 'user' | null;

type KangurLeaderboardOperationLabel = {
  emoji: string;
  label: string;
};

type KangurLeaderboardLocalizedValue = Record<KangurCoreLocale, string>;

type KangurLeaderboardOperationLabelDefinition = {
  emoji: string;
  label: KangurLeaderboardLocalizedValue;
};

export type KangurLeaderboardOperationOption = {
  emoji: string;
  id: string;
  label: string;
};

export type KangurLeaderboardUserOption = {
  icon: KangurLeaderboardUserFilterIcon;
  id: KangurLeaderboardUserFilter;
  label: string;
};

export type KangurLeaderboardItem = {
  accountLabel: string;
  currentUserBadgeLabel: string;
  id: string;
  isCurrentUser: boolean;
  isMedal: boolean;
  isRegistered: boolean;
  metaLabel: string;
  operationEmoji: string;
  operationLabel: string;
  operationSummary: string;
  playerName: string;
  rank: number;
  rankLabel: string;
  scoreLabel: string;
  timeLabel: string;
};

type FilterKangurLeaderboardScoresOptions = {
  limit?: number;
  operationFilter?: string;
  userFilter?: KangurLeaderboardUserFilter;
};

type BuildKangurLeaderboardItemsOptions = {
  currentUserEmail?: string | null;
  currentLearnerId?: string | null;
  locale?: string | null | undefined;
  scores: KangurScore[];
};

const OPERATION_LABELS: Record<string, KangurLeaderboardOperationLabelDefinition> = {
  all: {
    label: { de: 'Alle', en: 'All', pl: 'Wszystkie' },
    emoji: '🏆',
  },
  addition: {
    label: { de: 'Addition', en: 'Addition', pl: 'Dodawanie' },
    emoji: '➕',
  },
  subtraction: {
    label: { de: 'Subtraktion', en: 'Subtraction', pl: 'Odejmowanie' },
    emoji: '➖',
  },
  multiplication: {
    label: { de: 'Multiplikation', en: 'Multiplication', pl: 'Mnozenie' },
    emoji: '✖️',
  },
  division: {
    label: { de: 'Division', en: 'Division', pl: 'Dzielenie' },
    emoji: '➗',
  },
  calendar: {
    label: { de: 'Kalender', en: 'Calendar', pl: 'Kalendarz' },
    emoji: '📅',
  },
  decimals: {
    label: { de: 'Dezimalzahlen', en: 'Decimals', pl: 'Ulamki' },
    emoji: '🔢',
  },
  powers: {
    label: { de: 'Potenzen', en: 'Powers', pl: 'Potegi' },
    emoji: '⚡',
  },
  roots: {
    label: { de: 'Wurzeln', en: 'Roots', pl: 'Pierwiastki' },
    emoji: '√',
  },
  clock: {
    label: { de: 'Uhr', en: 'Clock', pl: 'Zegar' },
    emoji: '🕐',
  },
  mixed: {
    label: { de: 'Gemischt', en: 'Mixed', pl: 'Mieszane' },
    emoji: '🎲',
  },
  logical_thinking: {
    label: { de: 'Logisches Denken', en: 'Logical thinking', pl: 'Myslenie logiczne' },
    emoji: '🧠',
  },
  logical_patterns: {
    label: { de: 'Muster und Reihen', en: 'Patterns and sequences', pl: 'Wzorce i ciagi' },
    emoji: '🔢',
  },
  logical_classification: {
    label: { de: 'Klassifikation', en: 'Classification', pl: 'Klasyfikacja' },
    emoji: '📦',
  },
  logical_reasoning: {
    label: { de: 'Schlussfolgern', en: 'Reasoning', pl: 'Wnioskowanie' },
    emoji: '💡',
  },
  logical_analogies: {
    label: { de: 'Analogien', en: 'Analogies', pl: 'Analogie' },
    emoji: '🔗',
  },
};

const USER_OPTION_LABELS: Record<KangurLeaderboardUserFilter, KangurLeaderboardLocalizedValue> = {
  all: {
    de: 'Alle',
    en: 'All',
    pl: 'Wszyscy',
  },
  registered: {
    de: 'Angemeldet',
    en: 'Registered',
    pl: 'Zalogowani',
  },
  anonymous: {
    de: 'Anonym',
    en: 'Anonymous',
    pl: 'Anonimowi',
  },
};

const ACCOUNT_LABELS: Record<'registered' | 'anonymous', KangurLeaderboardLocalizedValue> = {
  registered: {
    de: 'Angemeldet',
    en: 'Registered',
    pl: 'Zalogowany',
  },
  anonymous: {
    de: 'Anonym',
    en: 'Anonymous',
    pl: 'Anonim',
  },
};

const CURRENT_USER_BADGE_LABEL: KangurLeaderboardLocalizedValue = {
  de: 'Du',
  en: 'You',
  pl: 'Ty',
};

export const getKangurLeaderboardOperationOptions = (
  locale?: string | null | undefined,
): KangurLeaderboardOperationOption[] =>
  Object.entries(OPERATION_LABELS).map(([id, info]) => ({
    id,
    emoji: info.emoji,
    label: localizeKangurCoreText(info.label, locale),
  }));

export const KANGUR_LEADERBOARD_OPERATION_OPTIONS: KangurLeaderboardOperationOption[] =
  getKangurLeaderboardOperationOptions();

export const getKangurLeaderboardUserFilterLabel = (
  value: KangurLeaderboardUserFilter,
  locale?: string | null | undefined,
): string => localizeKangurCoreText(USER_OPTION_LABELS[value], locale);

export const getKangurLeaderboardUserOptions = (
  locale?: string | null | undefined,
): KangurLeaderboardUserOption[] => [
  { id: 'all', label: getKangurLeaderboardUserFilterLabel('all', locale), icon: null },
  { id: 'registered', label: getKangurLeaderboardUserFilterLabel('registered', locale), icon: 'user' },
  { id: 'anonymous', label: getKangurLeaderboardUserFilterLabel('anonymous', locale), icon: 'ghost' },
];

export const KANGUR_LEADERBOARD_USER_OPTIONS: KangurLeaderboardUserOption[] =
  getKangurLeaderboardUserOptions();

export const getKangurLeaderboardOperationInfo = (
  operation: string,
  locale?: string | null | undefined,
): KangurLeaderboardOperationLabel =>
  OPERATION_LABELS[operation]
    ? {
        emoji: OPERATION_LABELS[operation].emoji,
        label: localizeKangurCoreText(OPERATION_LABELS[operation].label, locale),
      }
    : { emoji: '❓', label: operation };

export const filterKangurLeaderboardScores = (
  scores: KangurScore[],
  options: FilterKangurLeaderboardScoresOptions = {},
): KangurScore[] => {
  const operationFilter = options.operationFilter ?? 'all';
  const userFilter = options.userFilter ?? 'all';
  const limit =
    typeof options.limit === 'number' && options.limit > 0 ? Math.round(options.limit) : 10;

  return scores
    .filter((score) => {
      const operationMatch =
        operationFilter === 'all' || score.operation === operationFilter;
      const isRegistered = Boolean(score.created_by);
      const userMatch =
        userFilter === 'all' ||
        (userFilter === 'registered' && isRegistered) ||
        (userFilter === 'anonymous' && !isRegistered);

      return operationMatch && userMatch;
    })
    .slice(0, limit);
};

export const buildKangurLeaderboardItems = ({
  currentUserEmail,
  currentLearnerId,
  locale,
  scores,
}: BuildKangurLeaderboardItemsOptions): KangurLeaderboardItem[] =>
  scores.map((score, index) => {
    const isRegistered = Boolean(score.created_by);
    const operationInfo = getKangurLeaderboardOperationInfo(score.operation, locale);
    const medal = index < MEDALS.length ? MEDALS[index] : null;
    const isCurrentUser =
      (Boolean(currentLearnerId) && score.learner_id === currentLearnerId) ||
      (Boolean(currentUserEmail) && score.created_by === currentUserEmail);
    const accountLabel = isRegistered
      ? localizeKangurCoreText(ACCOUNT_LABELS.registered, locale)
      : localizeKangurCoreText(ACCOUNT_LABELS.anonymous, locale);

    return {
      accountLabel,
      currentUserBadgeLabel: localizeKangurCoreText(CURRENT_USER_BADGE_LABEL, locale),
      id: score.id,
      isCurrentUser,
      isMedal: medal !== null,
      isRegistered,
      metaLabel: `${operationInfo.emoji} ${operationInfo.label} · ${accountLabel}`,
      operationEmoji: operationInfo.emoji,
      operationLabel: operationInfo.label,
      operationSummary: `${operationInfo.emoji} ${operationInfo.label}`,
      playerName: score.player_name,
      rank: index + 1,
      rankLabel: medal ?? `${index + 1}.`,
      scoreLabel: `${score.score}/${score.total_questions}`,
      timeLabel: `${score.time_taken}s`,
    };
  });
