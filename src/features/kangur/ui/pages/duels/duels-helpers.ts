import type {
  KangurDuelMode,
  KangurDuelPlayer,
  KangurDuelPlayerStatus,
  KangurDuelQuestion,
  KangurDuelStatus,
} from '@/features/kangur/shared/contracts/kangur-duels';
import type { QuestionCardQuestion } from '@/features/kangur/ui/components/QuestionCard';

export const SESSION_STATUS_LABELS: Record<KangurDuelStatus, string> = {
  created: 'Utworzony',
  waiting: 'Czeka na gracza',
  ready: 'Gotowy do startu',
  in_progress: 'W trakcie',
  completed: 'Zakończony',
  aborted: 'Przerwany',
};

export const PLAYER_STATUS_LABELS: Record<KangurDuelPlayerStatus, string> = {
  invited: 'Zaproszony',
  ready: 'Gotowy',
  playing: 'Gra',
  completed: 'Zakończono',
  left: 'Opuścił',
};

export const LOBBY_MODE_LABELS: Record<KangurDuelMode, string> = {
  challenge: 'Wyzwanie',
  quick_match: 'Szybki pojedynek',
};

export const LOBBY_MODE_ACCENTS: Record<KangurDuelMode, 'indigo' | 'sky'> = {
  challenge: 'indigo',
  quick_match: 'sky',
};

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

export const buildWinnerSummary = (players: KangurDuelPlayer[]): string => {
  if (players.length === 0) return 'Pojedynek zakończony.';
  if (players.length === 1) {
    const onlyPlayer = players[0];
    return onlyPlayer ? `Wynik: ${onlyPlayer.displayName}` : 'Pojedynek zakończony.';
  }
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const first = sorted[0];
  const second = sorted[1];
  if (!first || !second) {
    return 'Pojedynek zakończony.';
  }
  if (first.score === second.score) {
    return 'Remis!';
  }
  return `Wygrywa ${first.displayName}!`;
};

export const resolveLobbyHostInitial = (name: string): string =>
  name.trim().charAt(0).toUpperCase() || '?';

export const formatRelativeAge = (isoString: string | null, nowMs: number): string => {
  if (!isoString) {
    return 'brak danych';
  }
  const fromMs = Date.parse(isoString);
  if (!Number.isFinite(fromMs)) {
    return 'brak danych';
  }
  const diffMs = Math.max(0, nowMs - fromMs);
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 5) {
    return 'przed chwilą';
  }
  if (seconds < 60) {
    return `${seconds}s temu`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min temu`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} godz. temu`;
  }
  const days = Math.floor(hours / 24);
  return `${days} dni temu`;
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
