import type { KangurLeaderboardItem } from '@kangur/core';
import type { KangurProgressState, KangurScore } from '@kangur/contracts/kangur';
import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';
import { formatKangurMobileScoreDateTime } from '../scores/mobileScoreSummary';

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
  mastery: {
    de: 'Opanowanie {masteryPercent}% · Spiele {gamesPlayed}',
    en: 'Mastery {masteryPercent}% · games {gamesPlayed}',
    pl: 'Opanowanie {masteryPercent}% · gier {gamesPlayed}',
  },
  localProgress: {
    de: 'Modus lokal gespeichert · Spiele {gamesPlayed}',
    en: 'Mode saved locally · games {gamesPlayed}',
    pl: 'Tryb zapisany lokalnie · gier {gamesPlayed}',
  },
  dailyPlan: {
    de: 'Das frische Ergebnis ist bereits bei den letzten Ergebnissen im Tagesplan sichtbar.',
    en: 'The fresh result is already visible in the recent results on the daily plan.',
    pl: 'Świeży wynik jest już widoczny w ostatnich wynikach w planie dnia.',
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

export const buildRecentResultsSurface = (args: {
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

export const buildProfileProgressSurface = (args: {
  hasOperationProgress: boolean;
  lessonMastery: number | null;
  locale: KangurMobileLocale;
  progress: KangurProgressState;
}): KangurPracticeSyncProofSurface =>
  args.hasOperationProgress
    ? {
        detail: args.lessonMastery !== null
          ? replacePracticeSyncProofTokens(
              localizePracticeSyncProofCopy(
                args.locale,
                PRACTICE_SYNC_PROOF_READY_COPY.mastery,
              ),
              {
                masteryPercent: args.lessonMastery,
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

export const buildDailyPlanSurface = (args: {
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

export const buildLeaderboardSurface = (args: {
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
