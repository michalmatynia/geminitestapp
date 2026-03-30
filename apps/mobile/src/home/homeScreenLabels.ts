import type { KangurDuelSeries } from '@kangur/contracts';

export const getHomeDuelModeLabel = (
  value: 'challenge' | 'quick_match',
  locale: 'pl' | 'en' | 'de',
): string => {
  if (value === 'quick_match') {
    return {
      de: 'Schnelles Spiel',
      en: 'Quick match',
      pl: 'Szybki mecz',
    }[locale];
  }

  return {
    de: 'Herausforderung',
    en: 'Challenge',
    pl: 'Wyzwanie',
  }[locale];
};

export const getHomeDuelDifficultyLabel = (
  value: 'easy' | 'medium' | 'hard',
  locale: 'pl' | 'en' | 'de',
): string => {
  if (value === 'hard') {
    return {
      de: 'schwer',
      en: 'hard',
      pl: 'trudny',
    }[locale];
  }

  if (value === 'medium') {
    return {
      de: 'mittel',
      en: 'medium',
      pl: 'średni',
    }[locale];
  }

  return {
    de: 'leicht',
    en: 'easy',
    pl: 'łatwy',
  }[locale];
};

export const getHomeDuelStatusLabel = (
  value: 'created' | 'waiting' | 'ready' | 'in_progress' | 'completed' | 'aborted',
  locale: 'pl' | 'en' | 'de',
): string => {
  if (value === 'in_progress') {
    return {
      de: 'Lauft',
      en: 'Live',
      pl: 'W trakcie',
    }[locale];
  }

  if (value === 'ready') {
    return {
      de: 'Bereit',
      en: 'Ready',
      pl: 'Gotowy',
    }[locale];
  }

  if (value === 'waiting') {
    return {
      de: 'Wartet',
      en: 'Waiting',
      pl: 'Oczekuje',
    }[locale];
  }

  if (value === 'completed') {
    return {
      de: 'Beendet',
      en: 'Completed',
      pl: 'Zakończony',
    }[locale];
  }

  if (value === 'aborted') {
    return {
      de: 'Abgebrochen',
      en: 'Aborted',
      pl: 'Przerwany',
    }[locale];
  }

  return {
    de: 'Erstellt',
    en: 'Created',
    pl: 'Utworzony',
  }[locale];
};

export const getHomeDuelSeriesLabel = (
  series: KangurDuelSeries,
  locale: 'pl' | 'en' | 'de',
): string => {
  const gameIndex = Math.min(series.bestOf, Math.max(1, series.gameIndex));

  if (series.isComplete) {
    return {
      de: `Serie BO${series.bestOf} • beendet nach ${series.completedGames} Spielen`,
      en: `BO${series.bestOf} series • completed after ${series.completedGames} games`,
      pl: `Seria BO${series.bestOf} • zakończona po ${series.completedGames} grach`,
    }[locale];
  }

  return {
    de: `Serie BO${series.bestOf} • Spiel ${gameIndex} von ${series.bestOf} • beendet: ${series.completedGames}`,
    en: `BO${series.bestOf} series • game ${gameIndex} of ${series.bestOf} • completed: ${series.completedGames}`,
    pl: `Seria BO${series.bestOf} • gra ${gameIndex} z ${series.bestOf} • ukończone: ${series.completedGames}`,
  }[locale];
};

export function formatHomeRelativeAge(
  isoString: string,
  locale: 'pl' | 'en' | 'de',
): string {
  const parsed = Date.parse(isoString);
  if (!Number.isFinite(parsed)) {
    return {
      de: 'gerade eben',
      en: 'just now',
      pl: 'przed chwilą',
    }[locale];
  }

  const seconds = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
  if (seconds < 10) {
    return {
      de: 'gerade eben',
      en: 'just now',
      pl: 'przed chwilą',
    }[locale];
  }
  if (seconds < 60) {
    return {
      de: `vor ${seconds}s`,
      en: `${seconds}s ago`,
      pl: `${seconds}s temu`,
    }[locale];
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return {
      de: `vor ${minutes} Min.`,
      en: `${minutes} min ago`,
      pl: `${minutes} min temu`,
    }[locale];
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return {
      de: `vor ${hours} Std.`,
      en: `${hours} hr ago`,
      pl: `${hours} godz. temu`,
    }[locale];
  }

  const days = Math.floor(hours / 24);
  return {
    de: `vor ${days} Tg.`,
    en: `${days} days ago`,
    pl: `${days} dni temu`,
  }[locale];
}
