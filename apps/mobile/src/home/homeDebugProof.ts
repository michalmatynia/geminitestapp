import type { KangurScore } from '@kangur/contracts';

import {
  getKangurMobileLocalizedValue,
  type KangurMobileLocale,
} from '../i18n/kangurMobileI18n';
import { formatKangurMobileScoreOperation } from '../scores/mobileScoreSummary';

type KangurHomeDebugProofOperationPerformance = {
  averageAccuracyPercent: number;
  operation: string;
  sessions: number;
};

export type KangurHomeDebugProofCheckStatus = 'info' | 'missing' | 'ready';

export type KangurHomeDebugProofCheck = {
  detail: string;
  label: string;
  status: KangurHomeDebugProofCheckStatus;
};

export type KangurHomeDebugProofViewModel = {
  checks: KangurHomeDebugProofCheck[];
  operation: string;
  operationLabel: string;
};

export const resolveKangurHomeDebugProofOperation = (
  value: string | string[] | null | undefined,
): string | null => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const normalizedValue = rawValue?.trim();
  return normalizedValue ? normalizedValue : null;
};

export const buildKangurHomeDebugProofViewModel = (input: {
  isEnabled: boolean;
  isLoading: boolean;
  locale?: KangurMobileLocale;
  operation: string | null;
  recentResults: KangurScore[];
  strongestOperation: KangurHomeDebugProofOperationPerformance | null;
  weakestOperation: KangurHomeDebugProofOperationPerformance | null;
}): KangurHomeDebugProofViewModel | null => {
  if (!input.operation) {
    return null;
  }

  const locale = input.locale ?? 'pl';

  if (input.isLoading) {
    return {
      checks: [
        {
          detail: getKangurMobileLocalizedValue(
            {
              de: 'Die Schulersitzung und die synchronisierten Ergebnisdaten für den Startbildschirm werden wiederhergestellt.',
              en: 'We are restoring the learner session and synchronized results data for home.',
              pl: 'Przywracamy sesję ucznia i zsynchronizowane dane wyników dla ekranu głównego.',
            },
            locale,
          ),
          label: getKangurMobileLocalizedValue(
            {
              de: 'Ergebniszentrale des Startbildschirms',
              en: 'Home results hub',
              pl: 'Centrum wyników strony głównej',
            },
            locale,
          ),
          status: 'info',
        },
      ],
      operation: input.operation,
      operationLabel: formatKangurMobileScoreOperation(input.operation, locale),
    };
  }

  if (!input.isEnabled) {
    return {
      checks: [
        {
          detail: getKangurMobileLocalizedValue(
            {
              de: 'Auf dem Startbildschirm ist die Ergebniszentrale für die Schulersitzung noch nicht aktiviert.',
              en: 'The home results hub is not enabled yet for the learner session.',
              pl: 'Na ekranie głównym nie włączono jeszcze centrum wyników dla sesji ucznia.',
            },
            locale,
          ),
          label: getKangurMobileLocalizedValue(
            {
              de: 'Ergebniszentrale des Startbildschirms',
              en: 'Home results hub',
              pl: 'Centrum wyników strony głównej',
            },
            locale,
          ),
          status: 'missing',
        },
      ],
      operation: input.operation,
      operationLabel: formatKangurMobileScoreOperation(input.operation, locale),
    };
  }

  const recentResult = input.recentResults.find(
    (result) => result.operation === input.operation,
  );
  const strongestOperation = input.strongestOperation;
  const weakestOperation = input.weakestOperation;

  return {
    checks: [
      recentResult
        ? {
            detail: getKangurMobileLocalizedValue(
              {
                de: `${recentResult.correct_answers}/${recentResult.total_questions} in den letzten synchronisierten Ergebnissen.`,
                en: `${recentResult.correct_answers}/${recentResult.total_questions} in the most recent synchronized scores.`,
                pl: `${recentResult.correct_answers}/${recentResult.total_questions} w ostatnich zsynchronizowanych wynikach.`,
              },
              locale,
            ),
            label: getKangurMobileLocalizedValue(
              {
                de: 'Ergebniszentrale',
                en: 'Results hub',
                pl: 'Centrum wyników',
              },
              locale,
            ),
            status: 'ready',
          }
        : {
            detail: getKangurMobileLocalizedValue(
              {
                de: 'Dieser Modus ist in der Ergebniszentrale noch nicht sichtbar.',
                en: 'This mode is not visible in the results hub yet.',
                pl: 'Ten tryb nie jest jeszcze widoczny w centrum wyników.',
              },
              locale,
            ),
            label: getKangurMobileLocalizedValue(
              {
                de: 'Ergebniszentrale',
                en: 'Results hub',
                pl: 'Centrum wyników',
              },
              locale,
            ),
            status: 'missing',
          },
      strongestOperation?.operation === input.operation
        ? {
            detail: getKangurMobileLocalizedValue(
              {
                de: `Stärkster Modus auf dem Startbildschirm: ${strongestOperation.averageAccuracyPercent}% in ${strongestOperation.sessions} Sitzungen.`,
                en: `Strongest mode on the home screen: ${strongestOperation.averageAccuracyPercent}% across ${strongestOperation.sessions} sessions.`,
                pl: `Najmocniejszy tryb na stronie głównej: ${strongestOperation.averageAccuracyPercent}% w ${strongestOperation.sessions} sesjach.`,
              },
              locale,
            ),
            label: getKangurMobileLocalizedValue(
              {
                de: 'Trainingsfokus',
                en: 'Training focus',
                pl: 'Fokus treningowy',
              },
              locale,
            ),
            status: 'ready',
          }
        : weakestOperation?.operation === input.operation
          ? {
              detail: getKangurMobileLocalizedValue(
                {
                  de: `Wiederholungsmodus auf dem Startbildschirm: ${weakestOperation.averageAccuracyPercent}% in ${weakestOperation.sessions} Sitzungen.`,
                  en: `Review mode on the home screen: ${weakestOperation.averageAccuracyPercent}% across ${weakestOperation.sessions} sessions.`,
                  pl: `Tryb do powtórki na stronie głównej: ${weakestOperation.averageAccuracyPercent}% w ${weakestOperation.sessions} sesjach.`,
                },
                locale,
              ),
              label: getKangurMobileLocalizedValue(
                {
                  de: 'Trainingsfokus',
                  en: 'Training focus',
                  pl: 'Fokus treningowy',
                },
                locale,
              ),
              status: 'ready',
            }
          : {
              detail: getKangurMobileLocalizedValue(
                {
                  de: 'Der Trainingsfokus ist schon bereit, aber dieser Modus ist gerade weder die stärkste noch die schwächste Karte.',
                  en: 'The training focus is ready, but this mode is neither the strongest nor the weakest card right now.',
                  pl: 'Fokus treningowy jest już gotowy, ale ten tryb nie jest teraz najmocniejszą ani najsłabszą kartą.',
                },
                locale,
              ),
              label: getKangurMobileLocalizedValue(
                {
                  de: 'Trainingsfokus',
                  en: 'Training focus',
                  pl: 'Fokus treningowy',
                },
                locale,
              ),
              status: 'missing',
            },
    ],
    operation: input.operation,
    operationLabel: formatKangurMobileScoreOperation(input.operation, locale),
  };
};
