import type { KangurMobileLocale, KangurMobileLocalizedValue } from '../../i18n/kangurMobileI18n';
import type { 
  KangurDuelStatus, 
  KangurDuelSession, 
  KangurDuelPlayer, 
  KangurDuelSeries,
  KangurDuelPlayerStatus
} from '@kangur/contracts/kangur-duels';
import type { KangurMobileTone as Tone } from '../../shared/KangurMobileUi';
import { DUEL_PLAYER_STATUS_LABELS } from './duels-constants';

export function localizeDuelText(
  value: KangurMobileLocalizedValue<string>,
  locale: KangurMobileLocale,
): string {
  return value[locale];
}

export function localizeSimpleDuelText(
  de: string,
  en: string,
  pl: string,
  locale: KangurMobileLocale,
): string {
  if (locale === 'de') return de;
  if (locale === 'en') return en;
  return pl;
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

export function formatPlayerStatusLabel(
  status: KangurDuelPlayerStatus,
  locale: KangurMobileLocale,
): string {
  return localizeDuelText(DUEL_PLAYER_STATUS_LABELS[status], locale);
}

export function resolveSeriesWins(
  series: KangurDuelSeries,
  learnerId: string,
): number {
  return series.winsByPlayer[learnerId] ?? 0;
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

export function formatRoundProgressLabel(
  progress: { current: number; total: number },
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

export function formatSeriesTitle(series: KangurDuelSeries, locale: KangurMobileLocale): string {
  const bestOf = (series.bestOf === 3 || series.bestOf === 5 || series.bestOf === 7 || series.bestOf === 9) ? series.bestOf : 1;
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
