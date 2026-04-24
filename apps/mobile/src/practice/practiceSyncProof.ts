import type { KangurLeaderboardItem } from '@kangur/core';
import type { KangurPracticeOperation } from '@kangur/core';
import type { KangurProgressState, KangurScore } from '@kangur/contracts/kangur';

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

const PRACTICE_SYNC_PROOF_COPY = {
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

const PRACTICE_SYNC_PROOF_READY_COPY = {
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

const PRACTICE_SYNC_PROOF_MISSING_COPY = {
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

type PracticeSyncScoreMatchInput = Pick<
  BuildKangurPracticeSyncProofInput,
  | 'expectedCorrectAnswers'
  | 'expectedTotalQuestions'
  | 'operation'
  | 'runStartedAt'
  | 'scores'
>;

const findExactPracticeSyncScoreMatches = ({
  expectedCorrectAnswers,
  expectedTotalQuestions,
  operation,
  scores,
}: Omit<PracticeSyncScoreMatchInput, 'runStartedAt'>): KangurScore[] =>
  scores.filter(
    (score) =>
      score.operation === operation &&
      score.correct_answers === expectedCorrectAnswers &&
      score.total_questions === expectedTotalQuestions,
  );

const canUseRunStartedAt = (runStartedAt: number): boolean =>
  Number.isFinite(runStartedAt) && runStartedAt > 0;

const wasScoreCreatedAfterRunStart = (
  score: KangurScore,
  runStartedAt: number,
): boolean => {
  const createdAt = Date.parse(score.created_date);
  return Number.isFinite(createdAt) && createdAt >= runStartedAt;
};

const findExactPracticeSyncScoreMatchCreatedAfterRunStart = (
  scores: KangurScore[],
  runStartedAt: number,
): KangurScore | null =>
  scores.find((score) => wasScoreCreatedAfterRunStart(score, runStartedAt)) ?? null;

const findMatchingKangurPracticeSyncScore = ({
  expectedCorrectAnswers,
  expectedTotalQuestions,
  operation,
  runStartedAt,
  scores,
}: PracticeSyncScoreMatchInput): KangurScore | null => {
  const exactMatches = findExactPracticeSyncScoreMatches({
    expectedCorrectAnswers,
    expectedTotalQuestions,
    operation,
    scores,
  });

  if (exactMatches.length === 0) {
    return null;
  }

  if (!canUseRunStartedAt(runStartedAt)) {
    return exactMatches[0] ?? null;
  }

  return findExactPracticeSyncScoreMatchCreatedAfterRunStart(exactMatches, runStartedAt);
};

const localizePracticeSyncProofCopy = <T extends Record<KangurMobileLocale, string>>(
  locale: KangurMobileLocale,
  value: T,
): string => value[locale];

const replacePracticeSyncProofTokens = (
  value: string,
  tokens: Record<string, string | number>,
): string =>
  Object.entries(tokens).reduce(
    (detail, [token, replacement]) => detail.replace(`{${token}}`, String(replacement)),
    value,
  );

const buildRecentResultsSurface = (args: {
  locale: KangurMobileLocale;
  matchedScore: KangurScore | null;
  operationLabel: string;
}): KangurPracticeSyncProofSurface =>
  args.matchedScore
    ? {
        detail: `${args.operationLabel} ${args.matchedScore.score}/${args.matchedScore.total_questions} · ${formatKangurMobileScoreDateTime(
          args.matchedScore.created_date,
          args.locale,
        )}`,
        label: localizePracticeSyncProofCopy(
          args.locale,
          PRACTICE_SYNC_PROOF_COPY.recentResults,
        ),
        status: 'ready',
      }
    : {
        detail: localizePracticeSyncProofCopy(
          args.locale,
          PRACTICE_SYNC_PROOF_MISSING_COPY.recentResults,
        ),
        label: localizePracticeSyncProofCopy(
          args.locale,
          PRACTICE_SYNC_PROOF_COPY.recentResults,
        ),
        status: 'missing',
      };

const buildProfileProgressSurface = (args: {
  hasOperationProgress: boolean;
  lessonMastery: KangurProgressState['lessonMastery'][KangurPracticeOperation] | null;
  locale: KangurMobileLocale;
  progress: KangurProgressState;
}): KangurPracticeSyncProofSurface =>
  args.hasOperationProgress
    ? {
        detail: args.lessonMastery
          ? replacePracticeSyncProofTokens(
              localizePracticeSyncProofCopy(
                args.locale,
                PRACTICE_SYNC_PROOF_READY_COPY.mastery,
              ),
              {
                masteryPercent: args.lessonMastery.masteryPercent,
                gamesPlayed: args.progress.gamesPlayed,
              },
            )
          : replacePracticeSyncProofTokens(
              localizePracticeSyncProofCopy(
                args.locale,
                PRACTICE_SYNC_PROOF_READY_COPY.localProgress,
              ),
              {
                gamesPlayed: args.progress.gamesPlayed,
              },
            ),
        label: localizePracticeSyncProofCopy(
          args.locale,
          PRACTICE_SYNC_PROOF_COPY.profileProgress,
        ),
        status: 'ready',
      }
    : {
        detail: localizePracticeSyncProofCopy(
          args.locale,
          PRACTICE_SYNC_PROOF_MISSING_COPY.profileProgress,
        ),
        label: localizePracticeSyncProofCopy(
          args.locale,
          PRACTICE_SYNC_PROOF_COPY.profileProgress,
        ),
        status: 'missing',
      };

const buildDailyPlanSurface = (args: {
  isVisibleInDailyPlan: boolean;
  locale: KangurMobileLocale;
}): KangurPracticeSyncProofSurface =>
  args.isVisibleInDailyPlan
    ? {
        detail: localizePracticeSyncProofCopy(
          args.locale,
          PRACTICE_SYNC_PROOF_READY_COPY.dailyPlan,
        ),
        label: localizePracticeSyncProofCopy(args.locale, PRACTICE_SYNC_PROOF_COPY.dailyPlan),
        status: 'ready',
      }
    : {
        detail: localizePracticeSyncProofCopy(
          args.locale,
          PRACTICE_SYNC_PROOF_MISSING_COPY.dailyPlan,
        ),
        label: localizePracticeSyncProofCopy(args.locale, PRACTICE_SYNC_PROOF_COPY.dailyPlan),
        status: 'missing',
      };

const buildLeaderboardSurface = (args: {
  leaderboardItem: KangurLeaderboardItem | null;
  locale: KangurMobileLocale;
}): KangurPracticeSyncProofSurface =>
  args.leaderboardItem
    ? {
        detail: `${args.leaderboardItem.rankLabel} ${args.leaderboardItem.playerName}${
          args.leaderboardItem.isCurrentUser
            ? ` · ${localizePracticeSyncProofCopy(args.locale, PRACTICE_SYNC_PROOF_COPY.you)}`
            : ''
        }`,
        label: localizePracticeSyncProofCopy(
          args.locale,
          PRACTICE_SYNC_PROOF_COPY.leaderboard,
        ),
        status: 'ready',
      }
    : {
        detail: localizePracticeSyncProofCopy(
          args.locale,
          PRACTICE_SYNC_PROOF_MISSING_COPY.leaderboard,
        ),
        label: localizePracticeSyncProofCopy(
          args.locale,
          PRACTICE_SYNC_PROOF_COPY.leaderboard,
        ),
        status: 'missing',
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

  return {
    matchedScoreId: matchedScore?.id ?? null,
    surfaces: [
      buildRecentResultsSurface({ locale, matchedScore, operationLabel }),
      buildProfileProgressSurface({
        hasOperationProgress,
        lessonMastery,
        locale,
        progress,
      }),
      buildDailyPlanSurface({ isVisibleInDailyPlan, locale }),
      buildLeaderboardSurface({ leaderboardItem, locale }),
    ],
  };
};
