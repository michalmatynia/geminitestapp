import { useCallback } from 'react';

import type { Toast } from '@/shared/contracts/ui';
import type { AiPathsValidationConfig } from '@/shared/lib/ai-paths';
import { normalizeAiPathsValidationConfig, AI_PATHS_LAST_ERROR_KEY } from '@/shared/lib/ai-paths';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export function useAiPathsValidationActions(args: {
  setAiPathsValidation: (config: AiPathsValidationConfig) => void;
  setLastError: (error: string | null) => void;
  toast: Toast;
}) {
  const { setAiPathsValidation, setLastError, toast } = args;

  const updateAiPathsValidation = useCallback(
    (patch: Partial<AiPathsValidationConfig>): void => {
      setAiPathsValidation(normalizeAiPathsValidationConfig(patch));
    },
    [setAiPathsValidation]
  );

  const persistLastError = useCallback(
    async (error: string | null): Promise<void> => {
      setLastError(error);
      try {
        if (typeof window !== 'undefined') {
          if (error === null) {
            window.localStorage.removeItem(AI_PATHS_LAST_ERROR_KEY);
          } else {
            window.localStorage.setItem(AI_PATHS_LAST_ERROR_KEY, error);
          }
        }
      } catch (err) {
        console.error('[ai-paths] Failed to persist last error', err);
      }
    },
    [setLastError]
  );

  const reportAiPathsError = useCallback(
    (error: unknown, context: Record<string, unknown>, fallbackMessage?: string): void => {
      const message = error instanceof Error ? error.message : String(error);
      const fullMessage = `[ai-paths] ${fallbackMessage ? fallbackMessage + ' ' : ''}${message}`;
      console.error(fullMessage, context, error);
      toast(fallbackMessage || message, { variant: 'error' });
      void persistLastError(fallbackMessage || message);

      const errorToLog = error instanceof Error ? error : new Error(message);
      logClientError(errorToLog, {
        context: {
          service: 'ai-paths',
          ...context,
        },
      });
    },
    [toast, persistLastError]
  );

  return {
    updateAiPathsValidation,
    persistLastError,
    reportAiPathsError,
  };
}
