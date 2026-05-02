import type { KangurScore } from '@kangur/contracts/kangur';

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
  const normalizedValue = rawValue?.trim() ?? '';
  return normalizedValue !== '' ? normalizedValue : null;
};

function resolveHomeResultsCheck(isLoading: boolean, isEnabled: boolean, locale: KangurMobileLocale): KangurHomeDebugProofCheck {
  const label = getKangurMobileLocalizedValue({
    de: 'Ergebnisse zum Start',
    en: 'Home results',
    pl: 'Wyniki na starcie',
  }, locale);

  if (isLoading) {
    return {
      detail: getKangurMobileLocalizedValue({
        de: 'Die Anmeldung und die Ergebnisdaten für den Start werden wiederhergestellt.',
        en: 'We are restoring sign-in and results data for home.',
        pl: 'Przywracamy logowanie i dane wyników dla startu.',
      }, locale),
      label,
      status: 'info',
    };
  }

  if (!isEnabled) {
    return {
      detail: getKangurMobileLocalizedValue({
        de: 'Die Ergebnisse zum Start sind für dieses Konto noch nicht aktiviert.',
        en: 'Home results are not enabled yet for this account.',
        pl: 'Wyniki na starcie nie są jeszcze włączone dla tego konta.',
      }, locale),
      label,
      status: 'missing',
    };
  }

  return {
    detail: getKangurMobileLocalizedValue({
      de: 'Die Ergebnisse zum Start sind bereit.',
      en: 'Home results are ready.',
      pl: 'Wyniki na starcie są gotowe.',
    }, locale),
    label,
    status: 'ready',
  };
}

function resolveResultsHubCheck(recentResult: KangurScore | undefined, locale: KangurMobileLocale): KangurHomeDebugProofCheck {
  const label = getKangurMobileLocalizedValue({
    de: 'Ergebniszentrale',
    en: 'Results hub',
    pl: 'Centrum wyników',
  }, locale);

  if (recentResult) {
    return {
      detail: getKangurMobileLocalizedValue({
        de: `${recentResult.correct_answers}/${recentResult.total_questions} in den letzten Ergebnissen.`,
        en: `${recentResult.correct_answers}/${recentResult.total_questions} in the latest results.`,
        pl: `${recentResult.correct_answers}/${recentResult.total_questions} w ostatnich wynikach.`,
      }, locale),
      label,
      status: 'ready',
    };
  }

  return {
    detail: getKangurMobileLocalizedValue({
      de: 'Dieser Modus ist in der Ergebniszentrale noch nicht sichtbar.',
      en: 'This mode is not visible in the results hub yet.',
      pl: 'Ten tryb nie jest jeszcze widoczny w centrum wyników.',
    }, locale),
    label,
    status: 'missing',
  };
}

function resolveTrainingFocusCheck(
  operation: string,
  strongest: KangurHomeDebugProofOperationPerformance | null,
  weakest: KangurHomeDebugProofOperationPerformance | null,
  locale: KangurMobileLocale,
): KangurHomeDebugProofCheck {
  const label = getKangurMobileLocalizedValue({
    de: 'Trainingsfokus',
    en: 'Training focus',
    pl: 'Fokus treningowy',
  }, locale);

  if (strongest?.operation === operation) {
    return {
      detail: getKangurMobileLocalizedValue({
        de: `Stärkster Modus hier: ${strongest.averageAccuracyPercent}% in ${strongest.sessions} Versuchen.`,
        en: `Strongest mode here: ${strongest.averageAccuracyPercent}% across ${strongest.sessions} attempts.`,
        pl: `Najmocniejszy tryb tutaj: ${strongest.averageAccuracyPercent}% w ${strongest.sessions} podejściach.`,
      }, locale),
      label,
      status: 'ready',
    };
  }

  if (weakest?.operation === operation) {
    return {
      detail: getKangurMobileLocalizedValue({
        de: `Wiederholungsmodus hier: ${weakest.averageAccuracyPercent}% in ${weakest.sessions} Versuchen.`,
        en: `Review mode here: ${weakest.averageAccuracyPercent}% across ${weakest.sessions} attempts.`,
        pl: `Tryb do powtórki tutaj: ${weakest.averageAccuracyPercent}% w ${weakest.sessions} podejściach.`,
      }, locale),
      label,
      status: 'ready',
    };
  }

  return {
    detail: getKangurMobileLocalizedValue({
      de: 'Der Trainingsfokus ist schon bereit, aber dieser Modus ist gerade weder die stärkste noch die schwächste Karte.',
      en: 'The training focus is ready, but this mode is neither the strongest nor the weakest card right now.',
      pl: 'Fokus treningowy jest już gotowy, ale ten tryb nie jest teraz najmocniejszą ani najsłabszą kartą.',
    }, locale),
    label,
    status: 'missing',
  };
}

export const buildKangurHomeDebugProofViewModel = (input: {
  isEnabled: boolean;
  isLoading: boolean;
  locale?: KangurMobileLocale;
  operation: string | null;
  recentResults: KangurScore[];
  strongestOperation: KangurHomeDebugProofOperationPerformance | null;
  weakestOperation: KangurHomeDebugProofOperationPerformance | null;
}): KangurHomeDebugProofViewModel | null => {
  const operation = input.operation;
  if (operation === null || operation === '') {
    return null;
  }

  const locale = input.locale ?? 'pl';

  if (input.isLoading || !input.isEnabled) {
    return {
      checks: [resolveHomeResultsCheck(input.isLoading, input.isEnabled, locale)],
      operation,
      operationLabel: formatKangurMobileScoreOperation(operation, locale),
    };
  }

  const recentResult = input.recentResults.find((r) => r.operation === operation);

  return {
    checks: [
      resolveResultsHubCheck(recentResult, locale),
      resolveTrainingFocusCheck(operation, input.strongestOperation, input.weakestOperation, locale),
    ],
    operation,
    operationLabel: formatKangurMobileScoreOperation(operation, locale),
  };
};
