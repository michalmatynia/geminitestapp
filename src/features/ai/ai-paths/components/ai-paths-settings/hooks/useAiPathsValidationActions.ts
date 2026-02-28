import { useCallback } from 'react';
import type { AiPathsValidationConfig } from '@/shared/lib/ai-paths';
import { normalizeAiPathsValidationConfig, AI_PATHS_LAST_ERROR_KEY } from '@/shared/lib/ai-paths';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export function useAiPathsValidationActions(args: {
  setAiPathsValidation: (config: AiPathsValidationConfig) => void;
  setLastError: (error: string | null) => void;
  toast: any;
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
    async (message: string, meta?: Record<string, unknown>): Promise<void> => {
      const fullMessage = `[ai-paths] ${message}`;
      console.error(fullMessage, meta);
      toast(message, { variant: 'error' });
      await persistLastError(message);
      void logClientError(fullMessage, {
        service: 'ai-paths',
        ...meta,
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
