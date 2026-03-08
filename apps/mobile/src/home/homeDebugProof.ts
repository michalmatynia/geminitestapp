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
          detail: 'Restoring learner session and synced score data.',
          label: 'Home score loop',
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
          detail: 'Learner-session score hooks are not enabled on home yet.',
          label: 'Home score loop',
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
            detail: `${recentResult.correct_answers}/${recentResult.total_questions} in recent synced results.`,
            label: 'Recent results',
            status: 'ready',
          }
        : {
            detail: 'This mode is not visible in the recent-results slice yet.',
            label: 'Recent results',
            status: 'missing',
          },
      strongestOperation?.operation === input.operation
        ? {
            detail: `Strongest mode on home at ${strongestOperation.averageAccuracyPercent}% across ${strongestOperation.sessions} sessions.`,
            label: 'Training focus',
            status: 'ready',
          }
        : weakestOperation?.operation === input.operation
          ? {
              detail: `Weakest mode on home at ${weakestOperation.averageAccuracyPercent}% across ${weakestOperation.sessions} sessions.`,
              label: 'Training focus',
              status: 'ready',
            }
          : {
              detail:
                'Home training focus is loaded, but this mode is not the current strongest or weakest card.',
              label: 'Training focus',
              status: 'missing',
            },
    ],
    operation: input.operation,
    operationLabel: formatKangurMobileScoreOperation(input.operation),
  };
};
