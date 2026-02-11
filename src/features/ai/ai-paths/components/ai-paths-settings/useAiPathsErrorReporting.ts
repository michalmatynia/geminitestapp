'use client';

import { useCallback } from 'react';

import { AI_PATHS_LAST_ERROR_KEY, safeStringify } from '@/features/ai/ai-paths/lib';
import { updateAiPathsSetting } from '@/features/ai/ai-paths/lib/settings-store-client';
import { logClientError } from '@/features/observability';

import { useGraphState, useRuntimeActions } from '../../context';

type LastErrorPayload = { message: string; time: string; pathId?: string | null } | null;

export interface AiPathsErrorReporting {
  /** Persist (or clear) last-error to the settings store. */
  persistLastError: (payload: LastErrorPayload) => Promise<void>;
  /** Report an error: sets last-error state, persists, and logs to observability. */
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => void;
}

/**
 * Provides error-reporting helpers for the AI-Paths feature.
 *
 * Replaces `persistLastError` and `reportAiPathsError` from legacy
 * `useAiPathsSettingsState`. Reads graph metadata from GraphContext
 * and sets the last-error via RuntimeActions.
 *
 * @param activeTab — the current tab, used for observability context
 */
export function useAiPathsErrorReporting(
  activeTab: 'canvas' | 'paths' | 'docs'
): AiPathsErrorReporting {
  const { activePathId, pathName, nodes, edges } = useGraphState();
  const { setLastError } = useRuntimeActions();

  const persistLastError = useCallback(
    async (payload: LastErrorPayload): Promise<void> => {
      try {
        await updateAiPathsSetting(
          AI_PATHS_LAST_ERROR_KEY,
          payload ? JSON.stringify(payload) : ''
        );
      } catch (error: unknown) {
        logClientError(error, { context: { source: 'useAiPathsErrorReporting', action: 'persistLastError' } });
      }
    },
    []
  );

  const reportAiPathsError = useCallback(
    (
      error: unknown,
      context: Record<string, unknown>,
      fallbackMessage?: string
    ): void => {
      const rawMessage =
        error instanceof Error ? error.message : safeStringify(error);
      const summary = (fallbackMessage ?? rawMessage).replace(/:$/, '');
      const logMessage = `[AI Paths] ${summary}`;
      const logError = new Error(logMessage);
      if (error instanceof Error && error.stack) {
        logError.stack = error.stack;
        logError.name = error.name;
      }
      const payload = {
        message: summary,
        time: new Date().toISOString(),
        pathId: activePathId,
      };
      setLastError(payload);
      void persistLastError(payload);
      logClientError(logError, {
        context: {
          feature: 'ai-paths',
          pathId: activePathId,
          pathName,
          tab: activeTab,
          nodeCount: nodes.length,
          edgeCount: edges.length,
          errorSummary: summary,
          rawMessage,
          ...context,
        },
      });
    },
    [activePathId, activeTab, edges.length, nodes.length, pathName, persistLastError, setLastError]
  );

  return { persistLastError, reportAiPathsError };
}
