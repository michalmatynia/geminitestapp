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
              de: 'Die Anmeldung und die Ergebnisdaten für den Start werden wiederhergestellt.',
              en: 'We are restoring sign-in and results data for home.',
              pl: 'Przywracamy logowanie i dane wyników dla startu.',
            },
            locale,
          ),
          label: getKangurMobileLocalizedValue(
            {
              de: 'Ergebnisse zum Start',
              en: 'Home results',
              pl: 'Wyniki na starcie',
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
              de: 'Die Ergebnisse zum Start sind für dieses Konto noch nicht aktiviert.',
              en: 'Home results are not enabled yet for this account.',
              pl: 'Wyniki na starcie nie są jeszcze włączone dla tego konta.',
            },
            locale,
          ),
          label: getKangurMobileLocalizedValue(
            {
              de: 'Ergebnisse zum Start',
              en: 'Home results',
              pl: 'Wyniki na starcie',
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
                de: `${recentResult.correct_answers}/${recentResult.total_questions} in den letzten Ergebnissen.`,
                en: `${recentResult.correct_answers}/${recentResult.total_questions} in the latest results.`,
                pl: `${recentResult.correct_answers}/${recentResult.total_questions} w ostatnich wynikach.`,
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
                de: `Stärkster Modus hier: ${strongestOperation.averageAccuracyPercent}% in ${strongestOperation.sessions} Versuchen.`,
                en: `Strongest mode here: ${strongestOperation.averageAccuracyPercent}% across ${strongestOperation.sessions} attempts.`,
                pl: `Najmocniejszy tryb tutaj: ${strongestOperation.averageAccuracyPercent}% w ${strongestOperation.sessions} podejściach.`,
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
                  de: `Wiederholungsmodus hier: ${weakestOperation.averageAccuracyPercent}% in ${weakestOperation.sessions} Versuchen.`,
                  en: `Review mode here: ${weakestOperation.averageAccuracyPercent}% across ${weakestOperation.sessions} attempts.`,
                  pl: `Tryb do powtórki tutaj: ${weakestOperation.averageAccuracyPercent}% w ${weakestOperation.sessions} podejściach.`,
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
