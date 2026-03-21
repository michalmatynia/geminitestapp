import type { KangurLeaderboardItem, KangurPracticeOperation } from '@kangur/core';
import type { KangurProgressState, KangurScore } from '@kangur/contracts';

import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';
import {
  formatKangurMobileScoreDateTime,
  formatKangurMobileScoreOperation,
} from '../scores/mobileScoreSummary';

export type KangurPracticeSyncProofSurfaceStatus = 'missing' | 'ready';

export type KangurPracticeSyncProofSurface = {
  detail: string;
  label: string;
  status: KangurPracticeSyncProofSurfaceStatus;
};

export type KangurPracticeSyncProofSnapshot = {
  matchedScoreId: string | null;
  surfaces: KangurPracticeSyncProofSurface[];
};

type BuildKangurPracticeSyncProofInput = {
  expectedCorrectAnswers: number;
  expectedTotalQuestions: number;
  leaderboardItems: KangurLeaderboardItem[];
  locale?: KangurMobileLocale;
  operation: KangurPracticeOperation;
  progress: KangurProgressState;
  runStartedAt: number;
  scores: KangurScore[];
};

const findMatchingKangurPracticeSyncScore = ({
  expectedCorrectAnswers,
  expectedTotalQuestions,
  operation,
  runStartedAt,
  scores,
}: Pick<
  BuildKangurPracticeSyncProofInput,
  | 'expectedCorrectAnswers'
  | 'expectedTotalQuestions'
  | 'operation'
  | 'runStartedAt'
  | 'scores'
>): KangurScore | null => {
  const exactMatches = scores.filter(
    (score) =>
      score.operation === operation &&
      score.correct_answers === expectedCorrectAnswers &&
      score.total_questions === expectedTotalQuestions,
  );

  if (exactMatches.length === 0) {
    return null;
  }

  if (!Number.isFinite(runStartedAt) || runStartedAt <= 0) {
    return exactMatches[0] ?? null;
  }

  return (
    exactMatches.find((score) => {
      const createdAt = Date.parse(score.created_date);
      return Number.isFinite(createdAt) && createdAt >= runStartedAt;
    }) ?? null
  );
};

export const buildKangurPracticeSyncProofSnapshot = ({
  expectedCorrectAnswers,
  expectedTotalQuestions,
  leaderboardItems,
  locale = 'pl',
  operation,
  progress,
  runStartedAt,
  scores,
}: BuildKangurPracticeSyncProofInput): KangurPracticeSyncProofSnapshot => {
  const matchedScore = findMatchingKangurPracticeSyncScore({
    expectedCorrectAnswers,
    expectedTotalQuestions,
    operation,
    runStartedAt,
    scores,
  });
  const operationLabel = formatKangurMobileScoreOperation(operation, locale);
  const lessonMastery = progress.lessonMastery[operation] ?? null;
  const hasOperationProgress =
    progress.operationsPlayed.includes(operation) || lessonMastery !== null;
  const planRecentResults = scores.slice(0, 3);
  const isVisibleInDailyPlan =
    matchedScore !== null &&
    planRecentResults.some((score) => score.id === matchedScore.id);
  const leaderboardItem =
    matchedScore !== null
      ? leaderboardItems.find((item) => item.id === matchedScore.id)
      : null;
  const copy = {
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
      de: 'Ergebnisverlauf',
      en: 'Result history',
      pl: 'Historia wyników',
    },
    you: {
      de: 'Du',
      en: 'You',
      pl: 'Ty',
    },
  } as const;
  const readyCopy = {
    dailyPlan: {
      de: 'Das frische Ergebnis ist im Bereich der letzten Ergebnisse sichtbar, den /plan verwendet.',
      en: 'The fresh result is visible in the recent-results section used by /plan.',
      pl: 'Świeży wynik jest widoczny w sekcji ostatnich wyników używanej przez /plan.',
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
  const missingCopy = {
    dailyPlan: {
      de: 'Das frische Ergebnis ist noch nicht im Bereich der letzten Ergebnisse fuer /plan angekommen.',
      en: 'The fresh result has not reached the recent-results section for /plan yet.',
      pl: 'Świeży wynik nie trafił jeszcze do sekcji ostatnich wyników dla /plan.',
    },
    leaderboard: {
      de: 'Das aktuelle synchronisierte Ergebnis ist in der Rangliste noch nicht sichtbar.',
      en: 'The current synced result is not visible in the leaderboard yet.',
      pl: 'Bieżący zsynchronizowany wynik nie jest jeszcze widoczny w rankingu.',
    },
    profileProgress: {
      de: 'Der lokale Fortschritt zeigt diesen Modus noch nicht in der Lektionsbeherrschung.',
      en: 'Local progress does not show this mode in lesson mastery yet.',
      pl: 'Lokalny postęp nie pokazuje jeszcze tego trybu w opanowaniu lekcji.',
    },
    recentResults: {
      de: 'Das frische synchronisierte Ergebnis ist im Verlauf der Lernenden noch nicht sichtbar.',
      en: 'The fresh synced result is not visible in the learner history yet.',
      pl: 'Świeży zsynchronizowany wynik nie jest jeszcze widoczny w historii ucznia.',
    },
  } as const;
  const localized = <T extends Record<KangurMobileLocale, string>>(value: T): string =>
    value[locale];

  return {
    matchedScoreId: matchedScore?.id ?? null,
    surfaces: [
      matchedScore
        ? {
            detail: `${operationLabel} ${matchedScore.score}/${matchedScore.total_questions} · ${formatKangurMobileScoreDateTime(
              matchedScore.created_date,
              locale,
            )}`,
            label: localized(copy.recentResults),
            status: 'ready',
          }
        : {
            detail: localized(missingCopy.recentResults),
            label: localized(copy.recentResults),
            status: 'missing',
          },
      hasOperationProgress
        ? {
            detail: lessonMastery
              ? localized(readyCopy.mastery)
                  .replace('{masteryPercent}', String(lessonMastery.masteryPercent))
                  .replace('{gamesPlayed}', String(progress.gamesPlayed))
              : localized(readyCopy.localProgress).replace(
                  '{gamesPlayed}',
                  String(progress.gamesPlayed),
                ),
            label: localized(copy.profileProgress),
            status: 'ready',
          }
        : {
            detail: localized(missingCopy.profileProgress),
            label: localized(copy.profileProgress),
            status: 'missing',
          },
      isVisibleInDailyPlan
        ? {
            detail: localized(readyCopy.dailyPlan),
            label: localized(copy.dailyPlan),
            status: 'ready',
          }
        : {
            detail: localized(missingCopy.dailyPlan),
            label: localized(copy.dailyPlan),
            status: 'missing',
          },
      leaderboardItem
        ? {
            detail: `${leaderboardItem.rankLabel} ${leaderboardItem.playerName}${
              leaderboardItem.isCurrentUser ? ` · ${localized(copy.you)}` : ''
            }`,
            label: localized(copy.leaderboard),
            status: 'ready',
          }
        : {
            detail: localized(missingCopy.leaderboard),
            label: localized(copy.leaderboard),
            status: 'missing',
          },
    ],
  };
};
