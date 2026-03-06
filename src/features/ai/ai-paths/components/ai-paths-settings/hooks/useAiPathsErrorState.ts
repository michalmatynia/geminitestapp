import { useCallback } from 'react';

import type { Toast } from '@/shared/ui';
import { useGraphActions } from '@/features/ai/ai-paths/context/GraphContext';
import { useRuntimeActions } from '@/features/ai/ai-paths/context/RuntimeContext';

import { useAiPathsValidationActions } from './useAiPathsValidationActions';

type LastErrorInfo = {
  message: string;
  time: string;
  pathId?: string | null;
} | null;

type UseAiPathsErrorStateArgs = { toast: Toast };

export function useAiPathsErrorState({ toast }: UseAiPathsErrorStateArgs) {
  const { setAiPathsValidation } = useGraphActions();
  const { setLastError } = useRuntimeActions();

  const setLastErrorString = useCallback(
    (error: string | null): void => {
      setLastError(error ? { message: error, time: new Date().toISOString() } : null);
    },
    [setLastError]
  );

  const validation = useAiPathsValidationActions({
    setAiPathsValidation,
    setLastError: setLastErrorString,
    toast,
  });

  const reportAiPathsError = useCallback(
    (error: unknown, context: Record<string, unknown>, fallbackMessage?: string): void => {
      validation.reportAiPathsError(error, context, fallbackMessage);
    },
    [validation.reportAiPathsError]
  );

  const persistLastError = useCallback(
    async (payload: LastErrorInfo): Promise<void> => {
      await validation.persistLastError(payload?.message ?? null);
    },
    [validation.persistLastError]
  );

  return {
    validation,
    reportAiPathsError,
    persistLastError,
  };
}
