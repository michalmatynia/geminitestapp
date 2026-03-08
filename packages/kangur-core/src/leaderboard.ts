import type { KangurScore } from '@kangur/contracts';

const MEDALS = ['🥇', '🥈', '🥉'] as const;

export type KangurLeaderboardUserFilter = 'all' | 'registered' | 'anonymous';
export type KangurLeaderboardUserFilterIcon = 'ghost' | 'user' | null;

type KangurLeaderboardOperationLabel = {
  emoji: string;
  label: string;
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
  scores: KangurScore[];
};

const OPERATION_LABELS: Record<string, KangurLeaderboardOperationLabel> = {
  all: { label: 'Wszystkie', emoji: '🏆' },
  addition: { label: 'Dodawanie', emoji: '➕' },
  subtraction: { label: 'Odejmowanie', emoji: '➖' },
  multiplication: { label: 'Mnozenie', emoji: '✖️' },
  division: { label: 'Dzielenie', emoji: '➗' },
  calendar: { label: 'Kalendarz', emoji: '📅' },
  decimals: { label: 'Ulamki', emoji: '🔢' },
  powers: { label: 'Potegi', emoji: '⚡' },
  roots: { label: 'Pierwiastki', emoji: '√' },
  clock: { label: 'Zegar', emoji: '🕐' },
  mixed: { label: 'Mieszane', emoji: '🎲' },
  logical_thinking: { label: 'Myslenie logiczne', emoji: '🧠' },
  logical_patterns: { label: 'Wzorce i ciagi', emoji: '🔢' },
  logical_classification: { label: 'Klasyfikacja', emoji: '📦' },
  logical_reasoning: { label: 'Wnioskowanie', emoji: '💡' },
  logical_analogies: { label: 'Analogie', emoji: '🔗' },
};

export const KANGUR_LEADERBOARD_OPERATION_OPTIONS: KangurLeaderboardOperationOption[] =
  Object.entries(OPERATION_LABELS).map(([id, info]) => ({
    id,
    ...info,
  }));

export const KANGUR_LEADERBOARD_USER_OPTIONS: KangurLeaderboardUserOption[] = [
  { id: 'all', label: 'Wszyscy', icon: null },
  { id: 'registered', label: 'Zalogowani', icon: 'user' },
  { id: 'anonymous', label: 'Anonimowi', icon: 'ghost' },
];

export const getKangurLeaderboardOperationInfo = (
  operation: string,
): KangurLeaderboardOperationLabel =>
  OPERATION_LABELS[operation] ?? { emoji: '❓', label: operation };

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
  scores,
}: BuildKangurLeaderboardItemsOptions): KangurLeaderboardItem[] =>
  scores.map((score, index) => {
    const isRegistered = Boolean(score.created_by);
    const operationInfo = getKangurLeaderboardOperationInfo(score.operation);
    const medal = index < MEDALS.length ? MEDALS[index] : null;
    const isCurrentUser =
      (Boolean(currentLearnerId) && score.learner_id === currentLearnerId) ||
      (Boolean(currentUserEmail) && score.created_by === currentUserEmail);

    return {
      accountLabel: isRegistered ? 'Zalogowany' : 'Anonim',
      currentUserBadgeLabel: 'Ty',
      id: score.id,
      isCurrentUser,
      isMedal: medal !== null,
      isRegistered,
      metaLabel: `${operationInfo.emoji} ${operationInfo.label} · ${
        isRegistered ? 'Zalogowany' : 'Anonim'
      }`,
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
