import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';

export type KangurPracticeSyncProofSurfaceStatus = 'missing' | 'ready';

export interface KangurPracticeSyncProofSurface {
  detail: string;
  label: string;
  status: KangurPracticeSyncProofSurfaceStatus;
}

export interface KangurPracticeSyncProofSnapshot {
  matchedScoreId: string | null;
  surfaces: KangurPracticeSyncProofSurface[];
}

export interface BuildKangurPracticeSyncProofInput {
  expectedCorrectAnswers: number;
  expectedTotalQuestions: number;
  leaderboardItems: { id: string }[];
  locale?: KangurMobileLocale;
  operation: string;
  progress: {
    lessonMastery: Record<string, number>;
    operationsPlayed: string[];
  };
  runStartedAt: string;
  scores: { id: string }[];
}

export const buildKangurPracticeSyncProofSnapshot = ({
  _locale = 'pl',
  _operation,
  _progress,
}: BuildKangurPracticeSyncProofInput): KangurPracticeSyncProofSnapshot => {
  return {
    matchedScoreId: null,
    surfaces: [],
  };
};

export const PRACTICE_SYNC_PROOF_COPY = {
  dailyPlan: {
    de: 'Tagesplan',
    en: 'Daily plan',
    pl: 'Plan dnia',
  },
  leaderboard: {
    de: 'Rangliste',
    en: 'Leaderboard',
    pl: 'Ranking',
  },
  profileProgress: {
    de: 'Profilfortschritt',
    en: 'Profile progress',
    pl: 'Postęp profilu',
  },
  recentResults: {
    de: 'Ergebniszentrale',
    en: 'Results hub',
    pl: 'Centrum wyników',
  },
  you: {
    de: 'Du',
    en: 'You',
    pl: 'Ty',
  },
} as const;

export const PRACTICE_SYNC_PROOF_READY_COPY = {
  dailyPlan: {
    de: 'Das frische Ergebnis ist bereits bei den letzten Ergebnissen im Tagesplan sichtbar.',
    en: 'The fresh result is already visible in the recent results on the daily plan.',
    pl: 'Świeży wynik jest już widoczny w ostatnich wynikach w planie dnia.',
  },
  localProgress: {
    de: 'Modus lokal gespeichert · Spiele {gamesPlayed}',
    en: 'Mode saved locally · games {gamesPlayed}',
    pl: 'Tryb zapisany lokalnie · gier {gamesPlayed}',
  },
  mastery: {
    de: 'Opanowanie {masteryPercent}% · Spiele {gamesPlayed}',
    en: 'Mastery {masteryPercent}% · games {gamesPlayed}',
    pl: 'Opanowanie {masteryPercent}% · gier {gamesPlayed}',
  },
} as const;

export const PRACTICE_SYNC_PROOF_MISSING_COPY = {
  dailyPlan: {
    de: 'Das frische Ergebnis ist bei den letzten Ergebnissen im Tagesplan noch nicht angekommen.',
    en: 'The fresh result has not appeared in the daily plan recent results yet.',
    pl: 'Świeży wynik nie pojawił się jeszcze w ostatnich wynikach planu dnia.',
  },
  leaderboard: {
    de: 'Das aktuelle Ergebnis ist in der Rangliste noch nicht sichtbar.',
    en: 'The current result is not visible in the leaderboard yet.',
    pl: 'Bieżący wynik nie jest jeszcze widoczny w rankingu.',
  },
  profileProgress: {
    de: 'Der lokale Fortschritt zeigt diesen Modus noch nicht in der Lektionsbeherrschung.',
    en: 'Local progress does not show this mode in lesson mastery yet.',
    pl: 'Lokalny postęp nie pokazuje jeszcze tego trybu w opanowaniu lekcji.',
  },
  recentResults: {
    de: 'Das frische Ergebnis ist im Verlauf der Lernenden noch nicht sichtbar.',
    en: 'The fresh result is not visible in the learner history yet.',
    pl: 'Świeży wynik nie jest jeszcze widoczny w historii ucznia.',
  },
} as const;

export const localizePracticeSyncProofCopy = (
  locale: KangurMobileLocale,
  value: Record<KangurMobileLocale, string>,
): string => value[locale];

export const replacePracticeSyncProofTokens = (
  value: string,
  tokens: Record<string, string | number>,
): string =>
  Object.entries(tokens).reduce(
    (detail, [token, replacement]) => detail.replace(`{${token}}`, String(replacement)),
    value,
  );
