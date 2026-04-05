'use client';

import { useCallback } from 'react';

import {
  DOCS_DESCRIPTION_SNIPPET,
  DOCS_JOBS_SNIPPET,
  DOCS_WIRING_SNIPPET,
} from '@/shared/lib/ai-paths/core/definitions/docs-snippets';
import type { Toast } from '@/shared/contracts/ui/base';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type UseAiPathsSettingsDocsActionsInput = {
  toast: Toast;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => void;
};

export type UseAiPathsSettingsDocsActionsReturn = {
  handleCopyDocsWiring: () => Promise<void>;
  handleCopyDocsDescription: () => Promise<void>;
  handleCopyDocsJobs: () => Promise<void>;
};

export function useAiPathsSettingsDocsActions({
  toast,
  reportAiPathsError,
}: UseAiPathsSettingsDocsActionsInput): UseAiPathsSettingsDocsActionsReturn {
  const handleCopyDocsWiring = useCallback(async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(DOCS_WIRING_SNIPPET);
      toast('Wiring copied to clipboard.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      reportAiPathsError(error, { action: 'copyDocsWiring' }, 'Failed to copy wiring:');
      toast('Failed to copy wiring.', { variant: 'error' });
    }
  }, [reportAiPathsError, toast]);

  const handleCopyDocsDescription = useCallback(async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(DOCS_DESCRIPTION_SNIPPET);
      toast('AI Description wiring copied.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      reportAiPathsError(
        error,
        { action: 'copyDocsDescription' },
        'Failed to copy AI Description wiring:'
      );
      toast('Failed to copy AI Description wiring.', { variant: 'error' });
    }
  }, [reportAiPathsError, toast]);

  const handleCopyDocsJobs = useCallback(async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(DOCS_JOBS_SNIPPET);
      toast('Jobs wiring copied.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      reportAiPathsError(error, { action: 'copyDocsJobs' }, 'Failed to copy jobs wiring:');
      toast('Failed to copy jobs wiring.', { variant: 'error' });
    }
  }, [reportAiPathsError, toast]);

  return {
    handleCopyDocsWiring,
    handleCopyDocsDescription,
    handleCopyDocsJobs,
  };
}
