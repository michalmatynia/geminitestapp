import { useCallback, type Dispatch, type SetStateAction } from 'react';

import type { AiPathsValidationConfig } from '@/shared/lib/ai-paths';
import type { Toast } from '@/shared/ui';

import { useAiPathsValidationActions } from './useAiPathsValidationActions';

type LastErrorInfo = {
  message: string;
  time: string;
  pathId?: string | null;
} | null;

type UseAiPathsErrorStateArgs = {
  setAiPathsValidationState: (config: AiPathsValidationConfig) => void;
  setLastError: Dispatch<SetStateAction<LastErrorInfo>>;
  toast: Toast;
};

export function useAiPathsErrorState({
  setAiPathsValidationState,
  setLastError,
  toast,
}: UseAiPathsErrorStateArgs) {
  const setLastErrorString = useCallback(
    (error: string | null): void => {
      setLastError(error ? { message: error, time: new Date().toISOString() } : null);
    },
    [setLastError]
  );

  const validation = useAiPathsValidationActions({
    setAiPathsValidation: setAiPathsValidationState,
    setLastError: setLastErrorString,
    toast: toast as unknown as Toast,
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
