import type { KangurScore } from '@kangur/contracts';

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
  operation: string | null;
  recentResults: KangurScore[];
  strongestOperation: KangurHomeDebugProofOperationPerformance | null;
  weakestOperation: KangurHomeDebugProofOperationPerformance | null;
}): KangurHomeDebugProofViewModel | null => {
  if (!input.operation) {
    return null;
  }

  if (input.isLoading) {
    return {
      checks: [
        {
          detail: 'Przywracamy sesję ucznia i zsynchronizowane dane wyników.',
          label: 'Pętla wyników strony głównej',
          status: 'info',
        },
      ],
      operation: input.operation,
      operationLabel: formatKangurMobileScoreOperation(input.operation),
    };
  }

  if (!input.isEnabled) {
    return {
      checks: [
        {
          detail: 'Na stronie głównej nie włączono jeszcze pętli wyników dla sesji ucznia.',
          label: 'Pętla wyników strony głównej',
          status: 'missing',
        },
      ],
      operation: input.operation,
      operationLabel: formatKangurMobileScoreOperation(input.operation),
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
            detail: `${recentResult.correct_answers}/${recentResult.total_questions} w ostatnich zsynchronizowanych wynikach.`,
            label: 'Ostatnie wyniki',
            status: 'ready',
          }
        : {
            detail: 'Ten tryb nie jest jeszcze widoczny w sekcji ostatnich wyników.',
            label: 'Ostatnie wyniki',
            status: 'missing',
          },
      strongestOperation?.operation === input.operation
        ? {
            detail: `Najmocniejszy tryb na stronie głównej: ${strongestOperation.averageAccuracyPercent}% w ${strongestOperation.sessions} sesjach.`,
            label: 'Fokus treningowy',
            status: 'ready',
          }
        : weakestOperation?.operation === input.operation
          ? {
              detail: `Tryb do powtórki na stronie głównej: ${weakestOperation.averageAccuracyPercent}% w ${weakestOperation.sessions} sesjach.`,
              label: 'Fokus treningowy',
              status: 'ready',
            }
          : {
              detail:
                'Fokus treningowy jest już gotowy, ale ten tryb nie jest teraz najmocniejszą ani najsłabszą kartą.',
              label: 'Fokus treningowy',
              status: 'missing',
            },
    ],
    operation: input.operation,
    operationLabel: formatKangurMobileScoreOperation(input.operation),
  };
};
