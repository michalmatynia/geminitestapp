import type { KangurDuelDifficulty, KangurDuelMode, KangurDuelOperation, KangurDuelPlayer, KangurDuelPlayerStatus, KangurDuelReactionType, KangurDuelSeries, KangurDuelSession, KangurDuelStatus } from '@kangur/contracts/kangur-duels';
import type { KangurDuelLobbyChatMessage } from '@kangur/contracts/kangur-duels-chat';
import type { Href } from 'expo-router';

import type {
  KangurMobileLocale,
  KangurMobileLocalizedValue,
} from '../i18n/kangurMobileI18n';
import type { KangurMobileTone as Tone } from '../shared/KangurMobileUi';

export const HOME_ROUTE = '/' as Href;
export const LESSONS_ROUTE = '/lessons' as Href;
export const PROFILE_ROUTE = '/profile' as Href;

export const localizeDuelText = (
  value: KangurMobileLocalizedValue<string>,
  locale: KangurMobileLocale,
): string => value[locale];

export const DUEL_MODE_LABELS: Record<KangurDuelMode, KangurMobileLocalizedValue<string>> = {
  challenge: {
    de: 'Herausforderung',
    en: 'Challenge',
    pl: 'Wyzwanie',
  },
  quick_match: {
    de: 'Schnelles Match',
    en: 'Quick match',
    pl: 'Szybki mecz',
  },
};

export const DUEL_OPERATION_SYMBOLS: Record<KangurDuelOperation, string> = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
};

export const DUEL_OPERATION_LABELS: Record<KangurDuelOperation, KangurMobileLocalizedValue<string>> = {
  addition: {
    de: 'Addition',
    en: 'Addition',
    pl: 'Dodawanie',
  },
  subtraction: {
    de: 'Subtraktion',
    en: 'Subtraction',
    pl: 'Odejmowanie',
  },
  multiplication: {
    de: 'Multiplikation',
    en: 'Multiplication',
    pl: 'Mnożenie',
  },
  division: {
    de: 'Division',
    en: 'Division',
    pl: 'Dzielenie',
  },
};

export const DUEL_DIFFICULTY_LABELS: Record<
  KangurDuelDifficulty,
  KangurMobileLocalizedValue<string>
> = {
  easy: {
    de: 'Leicht',
    en: 'Easy',
    pl: 'Łatwy',
  },
  medium: {
    de: 'Mittel',
    en: 'Medium',
    pl: 'Średni',
  },
  hard: {
    de: 'Schwer',
    en: 'Hard',
    pl: 'Trudny',
  },
};

export const DUEL_DIFFICULTY_EMOJIS: Record<KangurDuelDifficulty, string> = {
  easy: '🟢',
  medium: '🟡',
  hard: '🔴',
};

export const DUEL_STATUS_LABELS: Record<KangurDuelStatus, KangurMobileLocalizedValue<string>> = {
  aborted: {
    de: 'Abgebrochen',
    en: 'Aborted',
    pl: 'Przerwany',
  },
  completed: {
    de: 'Beendet',
    en: 'Completed',
    pl: 'Zakończony',
  },
  created: {
    de: 'Erstellt',
    en: 'Created',
    pl: 'Utworzony',
  },
  in_progress: {
    de: 'Läuft',
    en: 'In progress',
    pl: 'W trakcie',
  },
  ready: {
    de: 'Bereit',
    en: 'Ready',
    pl: 'Gotowy',
  },
  waiting: {
    de: 'Warten',
    en: 'Waiting',
    pl: 'Oczekiwanie',
  },
};

export const DUEL_PLAYER_STATUS_LABELS: Record<
  KangurDuelPlayerStatus,
  KangurMobileLocalizedValue<string>
> = {
  completed: {
    de: 'Fertig',
    en: 'Completed',
    pl: 'Ukończono',
  },
  invited: {
    de: 'Eingeladen',
    en: 'Invited',
    pl: 'Zaproszony',
  },
  left: {
    de: 'Verlassen',
    en: 'Left',
    pl: 'Wyszedł',
  },
  playing: {
    de: 'Spielt',
    en: 'Playing',
    pl: 'Gra',
  },
  ready: {
    de: 'Bereit',
    en: 'Ready',
    pl: 'Gotowy',
  },
};

export const MODE_FILTER_OPTIONS: Array<{
  value: 'all' | KangurDuelMode;
  label: KangurMobileLocalizedValue<string>;
}> = [
  {
    value: 'all',
    label: {
      de: 'Alle',
      en: 'All',
      pl: 'Wszystkie',
    },
  },
  {
    value: 'quick_match',
    label: {
      de: 'Schnelle Matches',
      en: 'Quick matches',
      pl: 'Szybkie mecze',
    },
  },
  {
    value: 'challenge',
    label: {
      de: 'Herausforderungen',
      en: 'Challenges',
      pl: 'Wyzwania',
    },
  },
];

export const OPERATION_OPTIONS: KangurDuelOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
];

export const DIFFICULTY_OPTIONS: KangurDuelDifficulty[] = ['easy', 'medium', 'hard'];
export const SERIES_BEST_OF_OPTIONS: Array<1 | 3 | 5 | 7 | 9> = [1, 3, 5, 7, 9];
export const DUEL_REACTION_OPTIONS: KangurDuelReactionType[] = [
  'cheer',
  'wow',
  'gg',
  'fire',
  'clap',
  'rocket',
  'thumbs_up',
];
export const LOBBY_CHAT_PREVIEW_LIMIT = 8;
export const AUTO_REFRESH_INTERVAL_MS = 15_000;

export const DUEL_REACTION_EMOJIS: Record<KangurDuelReactionType, string> = {
  cheer: '👏',
  wow: '😮',
  gg: '🤝',
  fire: '🔥',
  clap: '🙌',
  rocket: '🚀',
  thumbs_up: '👍',
};

export const DUEL_REACTION_LABELS: Record<
  KangurDuelReactionType,
  KangurMobileLocalizedValue<string>
> = {
  cheer: {
    de: 'Applaus',
    en: 'Cheer',
    pl: 'Brawa',
  },
  wow: {
    de: 'Wow',
    en: 'Wow',
    pl: 'Wow',
  },
  gg: {
    de: 'Gutes Spiel',
    en: 'Good game',
    pl: 'Dobra gra',
  },
  fire: {
    de: 'Feuer',
    en: 'Fire',
    pl: 'Ogień',
  },
  clap: {
    de: 'Super',
    en: 'Nice',
    pl: 'Super',
  },
  rocket: {
    de: 'Rakete',
    en: 'Rocket',
    pl: 'Rakieta',
  },
  thumbs_up: {
    de: 'Daumen hoch',
    en: 'Thumbs up',
    pl: 'Kciuk w górę',
  },
};

export function isWaitingSessionStatus(status: KangurDuelStatus): boolean {
  return status === 'waiting' || status === 'ready' || status === 'created';
}

export function getLessonMasteryTone(masteryPercent: number): Tone {
  if (masteryPercent >= 90) {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      textColor: '#047857',
    };
  }

  if (masteryPercent >= 70) {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }

  return {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    textColor: '#b91c1c',
  };
}

export function getStatusTone(status: KangurDuelStatus): Tone {
  if (status === 'completed') {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      textColor: '#047857',
    };
  }
  if (status === 'aborted') {
    return {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
      textColor: '#b91c1c',
    };
  }
  if (status === 'in_progress' || status === 'ready') {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }

  return {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    textColor: '#1d4ed8',
  };
}

export function getPlayerStatusTone(status: KangurDuelPlayerStatus): Tone {
  if (status === 'completed') {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      textColor: '#047857',
    };
  }
  if (status === 'left') {
    return {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
      textColor: '#b91c1c',
    };
  }
  if (status === 'playing') {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }

  return {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    textColor: '#1d4ed8',
  };
}

export function formatModeLabel(mode: KangurDuelMode, locale: KangurMobileLocale): string {
  return localizeDuelText(DUEL_MODE_LABELS[mode], locale);
}

export function formatOperationLabel(
  operation: KangurDuelOperation,
  locale: KangurMobileLocale,
): string {
  return `${DUEL_OPERATION_SYMBOLS[operation]} ${localizeDuelText(DUEL_OPERATION_LABELS[operation], locale)}`;
}

export function formatDifficultyLabel(
  difficulty: KangurDuelDifficulty,
  locale: KangurMobileLocale,
): string {
  return `${DUEL_DIFFICULTY_EMOJIS[difficulty]} ${localizeDuelText(DUEL_DIFFICULTY_LABELS[difficulty], locale)}`;
}

export function formatStatusLabel(status: KangurDuelStatus, locale: KangurMobileLocale): string {
  return localizeDuelText(DUEL_STATUS_LABELS[status], locale);
}

export function formatSeriesBestOfLabel(
  bestOf: 1 | 3 | 5 | 7 | 9,
  locale: KangurMobileLocale,
): string {
  if (bestOf === 1) {
    return localizeDuelText(
      {
        de: 'Einzelnes Match',
        en: 'Single match',
        pl: 'Pojedynczy mecz',
      },
      locale,
    );
  }

  return localizeDuelText(
    {
      de: `BO${bestOf}-Serie`,
      en: `BO${bestOf} series`,
      pl: `Seria BO${bestOf}`,
    },
    locale,
  );
}

export function normalizeSeriesBestOf(
  bestOf: number | null | undefined,
): 1 | 3 | 5 | 7 | 9 {
  if (bestOf === 3 || bestOf === 5 || bestOf === 7 || bestOf === 9) {
    return bestOf;
  }

  return 1;
}

export function formatPlayerStatusLabel(
  status: KangurDuelPlayerStatus,
  locale: KangurMobileLocale,
): string {
  return localizeDuelText(DUEL_PLAYER_STATUS_LABELS[status], locale);
}

export function formatReactionLabel(
  type: KangurDuelReactionType,
  locale: KangurMobileLocale,
): string {
  return `${DUEL_REACTION_EMOJIS[type]} ${localizeDuelText(DUEL_REACTION_LABELS[type], locale)}`;
}

function localizeSimpleDuelText(
  de: string,
  en: string,
  pl: string,
  locale: KangurMobileLocale,
): string {
  if (locale === 'de') return de;
  if (locale === 'en') return en;
  return pl;
}

export function formatRelativeAge(isoString: string, locale: KangurMobileLocale): string {
  const parsed = Date.parse(isoString);
  const justNow = {
    de: 'gerade eben',
    en: 'just now',
    pl: 'przed chwilą',
  };

  if (!Number.isFinite(parsed)) {
    return localizeDuelText(justNow, locale);
  }

  const seconds = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
  if (seconds < 10) {
    return localizeDuelText(justNow, locale);
  }

  if (seconds < 60) {
    return localizeSimpleDuelText(`vor ${seconds}s`, `${seconds}s ago`, `${seconds}s temu`, locale);
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return localizeSimpleDuelText(`vor ${minutes} Min.`, `${minutes} min ago`, `${minutes} min temu`, locale);
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return localizeSimpleDuelText(`vor ${hours} Std.`, `${hours} hr ago`, `${hours} godz. temu`, locale);
  }

  const days = Math.floor(hours / 24);
  return localizeSimpleDuelText(`vor ${days} Tagen`, `${days} days ago`, `${days} dni temu`, locale);
}

export function formatQuestionProgress(
  session: KangurDuelSession,
  player: KangurDuelPlayer,
  locale: KangurMobileLocale,
): string {
  const completed = Math.min(player.currentQuestionIndex ?? 0, session.questionCount);
  return localizeSimpleDuelText(
    `${completed}/${session.questionCount} Fragen`,
    `${completed}/${session.questionCount} questions`,
    `${completed}/${session.questionCount} pytań`,
    locale,
  );
}

export function formatSpectatorQuestionProgress(
  session: KangurDuelSession,
  locale: KangurMobileLocale,
): string {
  let currentQuestion = session.currentQuestionIndex ?? 0;
  if (session.status === 'in_progress') {
    currentQuestion += 1;
  }
  const displayQuestion = Math.min(currentQuestion, session.questionCount);

  return localizeSimpleDuelText(
    `Runde ${displayQuestion}/${session.questionCount}`,
    `Round ${displayQuestion}/${session.questionCount}`,
    `Runda ${displayQuestion}/${session.questionCount}`,
    locale,
  );
}

export type DuelRoundProgress = {
  current: number;
  percent: number;
  total: number;
};

export function resolveRoundProgress(
  session: KangurDuelSession,
  player: KangurDuelPlayer | null,
  isSpectating: boolean,
): DuelRoundProgress {
  const total = Math.max(session.questionCount, 1);
  let current: number;

  if (session.status === 'completed' || session.status === 'aborted') {
    current = total;
  } else if (session.status === 'in_progress') {
    const rawIndex = isSpectating ? (session.currentQuestionIndex ?? 0) : (player?.currentQuestionIndex ?? 0);
    current = Math.min(rawIndex + 1, total);
  } else {
    const rawIndex = isSpectating ? (session.currentQuestionIndex ?? 0) : (player?.currentQuestionIndex ?? 0);
    current = Math.min(rawIndex, total);
  }

  return {
    current,
    percent: Math.max(0, Math.min(100, Math.round((current / total) * 100))),
    total,
  };
}

export function formatRoundProgressLabel(
  progress: DuelRoundProgress,
  locale: KangurMobileLocale,
): string {
  const progressText = `${progress.current}/${progress.total}`;
  return localizeSimpleDuelText(
    `Rundenfortschritt ${progressText}`,
    `Round progress ${progressText}`,
    `Postęp rundy ${progressText}`,
    locale,
  );
}

export function resolveWinnerSummary(
  players: KangurDuelPlayer[],
  locale: KangurMobileLocale,
): string {
  const defaultSummary = {
    de: 'Das Duell ist beendet.',
    en: 'The duel is finished.',
    pl: 'Pojedynek zakończony.',
  };

  if (players.length === 0) {
    return localizeDuelText(defaultSummary, locale);
  }

  const sorted = [...players].sort((left, right) => {
    const leftScore = left.score + (left.bonusPoints ?? 0);
    const rightScore = right.score + (right.bonusPoints ?? 0);
    return rightScore - leftScore;
  });
  const topPlayer = sorted[0];
  const secondPlayer = sorted[1];

  if (!topPlayer) {
    return localizeDuelText(defaultSummary, locale);
  }

  const topScore = topPlayer.score + (topPlayer.bonusPoints ?? 0);
  const secondScore = secondPlayer !== undefined
    ? secondPlayer.score + (secondPlayer.bonusPoints ?? 0)
    : null;

  if (secondScore !== null && secondScore === topScore) {
    return localizeDuelText(
      {
        de: 'Unentschieden nach der letzten Runde.',
        en: 'Draw after the final round.',
        pl: 'Remis po ostatniej rundzie.',
      },
      locale,
    );
  }

  return localizeSimpleDuelText(
    `${topPlayer.displayName} gewinnt mit ${topScore} Punkten.`,
    `${topPlayer.displayName} wins with ${topScore} points.`,
    `Wygrywa ${topPlayer.displayName} z wynikiem ${topScore}.`,
    locale,
  );
}

export function formatSeriesTitle(series: KangurDuelSeries, locale: KangurMobileLocale): string {
  return formatSeriesBestOfLabel(normalizeSeriesBestOf(series.bestOf), locale);
}

export function formatSeriesProgress(
  series: KangurDuelSeries,
  locale: KangurMobileLocale,
): string {
  const gameIndex = Math.min(
    series.bestOf,
    Math.max(1, series.gameIndex),
  );
  return localizeSimpleDuelText(
    `Spiel ${gameIndex} von ${series.bestOf}`,
    `Game ${gameIndex} of ${series.bestOf}`,
    `Gra ${gameIndex} z ${series.bestOf}`,
    locale,
  );
}

export function formatLobbySeriesSummary(
  series: KangurDuelSeries,
  locale: KangurMobileLocale,
): string {
  if (series.isComplete) {
    return localizeSimpleDuelText(
      `Serie beendet · abgeschlossene Spiele: ${series.completedGames}`,
      `Series complete · completed games: ${series.completedGames}`,
      `Seria zakończona · ukończone gry: ${series.completedGames}`,
      locale,
    );
  }

  const progress = formatSeriesProgress(series, locale);
  return localizeSimpleDuelText(
    `${progress} · abgeschlossene Spiele: ${series.completedGames}`,
    `${progress} · completed games: ${series.completedGames}`,
    `${progress} · ukończone gry: ${series.completedGames}`,
    locale,
  );
}

export function resolveSeriesWins(
  series: KangurDuelSeries,
  learnerId: string,
): number {
  return series.winsByPlayer[learnerId] ?? 0;
}

export function formatSeriesSummary(
  series: KangurDuelSeries,
  players: KangurDuelPlayer[],
  locale: KangurMobileLocale,
): string {
  if (players.length === 0) {
    return localizeSimpleDuelText(
      `${series.completedGames} Spiele der Serie wurden abgeschlossen.`,
      `${series.completedGames} games in the series have been completed.`,
      `Ukończono ${series.completedGames} gier w serii.`,
      locale,
    );
  }

  const rankedPlayers = [...players].sort((left, right) => {
    const leftWins = resolveSeriesWins(series, left.learnerId);
    const rightWins = resolveSeriesWins(series, right.learnerId);
    return rightWins - leftWins;
  });
  const leader =
    players.find((player) => player.learnerId === series.leaderLearnerId) ??
    rankedPlayers[0] ??
    null;
  const challenger = rankedPlayers.find(
    (player) => player.learnerId !== leader?.learnerId,
  );

  if (!leader) {
    return localizeSimpleDuelText(
      `${series.completedGames} Spiele der Serie wurden abgeschlossen.`,
      `${series.completedGames} games in the series have been completed.`,
      `Ukończono ${series.completedGames} gier w serii.`,
      locale,
    );
  }

  const leaderWins = resolveSeriesWins(series, leader.learnerId);
  const challengerWins = challenger !== undefined
    ? resolveSeriesWins(series, challenger.learnerId)
    : 0;

  if (series.isComplete) {
    if (challenger !== undefined && challengerWins === leaderWins) {
      return localizeSimpleDuelText(
        `Die Serie endete unentschieden ${leaderWins}:${challengerWins}.`,
        `The series ended in a ${leaderWins}:${challengerWins} draw.`,
        `Seria zakończona remisem ${leaderWins}:${challengerWins}.`,
        locale,
      );
    }

    return localizeSimpleDuelText(
      `${leader.displayName} gewinnt die Serie ${leaderWins}:${challengerWins}.`,
      `${leader.displayName} wins the series ${leaderWins}:${challengerWins}.`,
      `Serię wygrywa ${leader.displayName} ${leaderWins}:${challengerWins}.`,
      locale,
    );
  }

  if (leaderWins === 0 && challengerWins === 0) {
    return localizeDuelText(
      {
        de: 'Die Serie hat gerade erst begonnen.',
        en: 'The series has just started.',
        pl: 'Seria dopiero się zaczęła.',
      },
      locale,
    );
  }

  return localizeSimpleDuelText(
    `${leader.displayName} führt in der Serie ${leaderWins}:${challengerWins}.`,
    `${leader.displayName} leads the series ${leaderWins}:${challengerWins}.`,
    `${leader.displayName} prowadzi w serii ${leaderWins}:${challengerWins}.`,
    locale,
  );
}

export function resolveSessionIdParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = typeof raw === 'string' ? raw.trim() : '';
  return normalized || null;
}

export function resolveSpectateParam(value: string | string[] | undefined): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export function formatLobbyChatSenderLabel(
  message: KangurDuelLobbyChatMessage,
  activeLearnerId: string | null,
  locale: KangurMobileLocale,
): string {
  return message.senderId === activeLearnerId
    ? localizeDuelText(
        {
          de: 'Du',
          en: 'You',
          pl: 'Ty',
        },
        locale,
      )
    : message.senderName;
}
