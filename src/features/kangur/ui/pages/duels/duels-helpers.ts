import type { TranslationValues } from 'use-intl';
import type {
  KangurDuelDifficulty,
  KangurDuelMode,
  KangurDuelOperation,
  KangurDuelPlayer,
  KangurDuelPlayerStatus,
  KangurDuelQuestion,
  KangurDuelStatus,
} from '@/features/kangur/shared/contracts/kangur-duels';
import type { QuestionCardQuestion } from '@/features/kangur/ui/components/game-runtime/QuestionCard';

export type KangurDuelTranslationValues = TranslationValues;
export type KangurDuelTranslations = (
  key: string,
  values?: KangurDuelTranslationValues
) => string;

export const LOBBY_MODE_ACCENTS: Record<KangurDuelMode, 'indigo' | 'sky'> = {
  challenge: 'indigo',
  quick_match: 'sky',
};

export const DUEL_OPERATION_SYMBOLS: Record<KangurDuelOperation, string> = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
};

export const DUEL_DIFFICULTY_EMOJIS: Record<KangurDuelDifficulty, string> = {
  easy: '🟢',
  medium: '🟡',
  hard: '🔴',
};

export const formatSessionStatusLabel = (
  status: KangurDuelStatus,
  translations: KangurDuelTranslations
): string => translations(`status.session.${status}`);

export const formatPlayerStatusLabel = (
  status: KangurDuelPlayerStatus,
  translations: KangurDuelTranslations
): string => translations(`status.player.${status}`);

export const formatLobbyModeLabel = (
  mode: KangurDuelMode,
  translations: KangurDuelTranslations
): string => translations(`mode.${mode}`);

export const formatDuelOperationLabel = (
  operation: KangurDuelOperation,
  translations: KangurDuelTranslations
): string => `${DUEL_OPERATION_SYMBOLS[operation]} ${translations(`operation.${operation}`)}`;

export const formatDuelDifficultyLabel = (
  difficulty: KangurDuelDifficulty,
  translations: KangurDuelTranslations
): string => `${DUEL_DIFFICULTY_EMOJIS[difficulty]} ${translations(`difficulty.${difficulty}`)}`;

export const resolveSessionAccent = (
  status: KangurDuelStatus
): 'emerald' | 'amber' | 'rose' | 'slate' => {
  if (status === 'completed') return 'emerald';
  if (status === 'aborted') return 'rose';
  if (status === 'in_progress') return 'amber';
  if (status === 'ready') return 'amber';
  return 'slate';
};

export const resolvePlayerAccent = (
  status: KangurDuelPlayerStatus
): 'emerald' | 'amber' | 'rose' | 'slate' => {
  if (status === 'completed') return 'emerald';
  if (status === 'left') return 'rose';
  if (status === 'playing') return 'amber';
  if (status === 'ready') return 'amber';
  return 'slate';
};

export const toQuestionCardQuestion = (
  question: KangurDuelQuestion | null
): QuestionCardQuestion | null => {
  if (!question) return null;
  return {
    id: question.id,
    question: question.prompt,
    choices: question.choices,
  };
};

export const buildWinnerSummary = (
  players: KangurDuelPlayer[],
  translations: KangurDuelTranslations
): string => {
  if (players.length === 0) return translations('winner.completed');
  if (players.length === 1) {
    const onlyPlayer = players[0];
    return onlyPlayer
      ? translations('winner.score', { name: onlyPlayer.displayName })
      : translations('winner.completed');
  }
  const scores = players.map((player) => player.score + (player.bonusPoints ?? 0));
  const topScore = Math.max(...scores);
  const topPlayers = players.filter(
    (player) => player.score + (player.bonusPoints ?? 0) === topScore
  );
  if (topPlayers.length === 1) {
    return translations('winner.wins', { name: topPlayers[0]!.displayName });
  }
  const fastest = resolveFastestPlayer(topPlayers);
  if (fastest) {
    return translations('winner.wins', { name: fastest.displayName });
  }
  return translations('winner.tie');
};

export const formatElapsedTime = (
  startedAt: string | null | undefined,
  completedAt: string | null | undefined
): string | null => {
  if (!startedAt || !completedAt) {
    return null;
  }
  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(completedAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return null;
  }
  const diffSec = Math.round((endMs - startMs) / 1000);
  return formatDurationLabel(diffSec);
};

const resolveCompletedAtMs = (player: KangurDuelPlayer): number | null =>
  player.completedAt ? Date.parse(player.completedAt) : null;

const isRankedCompletedPlayer = (
  entry: {
    completedAtMs: number | null;
    player: KangurDuelPlayer;
  }
): entry is { completedAtMs: number; player: KangurDuelPlayer } =>
  typeof entry.completedAtMs === 'number' && Number.isFinite(entry.completedAtMs);

const resolveRankedCompletedPlayers = (
  players: KangurDuelPlayer[]
): Array<{ completedAtMs: number; player: KangurDuelPlayer }> =>
  players
    .map((player) => ({
      player,
      completedAtMs: resolveCompletedAtMs(player),
    }))
    .filter(isRankedCompletedPlayer);

const hasSharedFastestCompletion = (
  ranked: Array<{ completedAtMs: number; player: KangurDuelPlayer }>
): boolean => ranked.length >= 2 && ranked[0]?.completedAtMs === ranked[1]?.completedAtMs;

const resolveFastestPlayer = (players: KangurDuelPlayer[]): KangurDuelPlayer | null => {
  if (players.length <= 1) {
    return players[0] ?? null;
  }

  const ranked = resolveRankedCompletedPlayers(players);
  if (ranked.length === 0) {
    return null;
  }

  ranked.sort((left, right) => left.completedAtMs - right.completedAtMs);
  if (hasSharedFastestCompletion(ranked)) {
    return null;
  }

  return ranked[0]?.player ?? null;
};

export const resolveLobbyHostInitial = (name: string): string =>
  name.trim().charAt(0).toUpperCase() || '?';

export const formatRelativeAge = (
  isoString: string | null,
  nowMs: number,
  translations: KangurDuelTranslations
): string => {
  if (!isoString) {
    return translations('relative.missingData');
  }
  const fromMs = Date.parse(isoString);
  if (!Number.isFinite(fromMs)) {
    return translations('relative.missingData');
  }
  const diffMs = Math.max(0, nowMs - fromMs);
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 5) {
    return translations('relative.justNow');
  }
  if (seconds < 60) {
    return translations('relative.secondsAgo', { count: seconds });
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return translations('relative.minutesAgo', { count: minutes });
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return translations('relative.hoursAgo', { count: hours });
  }
  const days = Math.floor(hours / 24);
  return translations('relative.daysAgo', { count: days });
};

export const formatDurationLabel = (seconds: number): string => {
  if (!Number.isFinite(seconds)) {
    return '—';
  }
  const safeSeconds = Math.max(0, Math.round(seconds));
  if (safeSeconds < 60) {
    return `${safeSeconds}s`;
  }
  const minutes = Math.ceil(safeSeconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
};
