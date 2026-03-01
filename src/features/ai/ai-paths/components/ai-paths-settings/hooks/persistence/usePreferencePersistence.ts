import { useCallback, useRef } from 'react';
import { AI_PATHS_UI_STATE_KEY } from '@/shared/lib/ai-paths';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  USER_PREFERENCES_STALE_MS,
  type AiPathsUiState,
  type AiPathsUserPreferences,
  type UseAiPathsPersistenceArgs,
} from '../../useAiPathsPersistence.types';

import {
  type AiPathsSettingRecord,
  updateAiPathsSettingsBulk,
} from '@/shared/lib/ai-paths/settings-store-client';

export function usePreferencePersistence(
  _args: UseAiPathsPersistenceArgs,
  core: {
    enqueueSettingsWrite: <T>(operation: () => Promise<T>) => Promise<T>;
    stringifyForStorage: (value: unknown, label: string) => string;
  }
) {
  const lastUiStatePayloadRef = useRef<string | null>(null);
  const lastUserPrefsActivePathIdRef = useRef<string | null>(null);

  const persistUiState = useCallback(
    async (uiState: AiPathsUiState): Promise<void> => {
      await core.enqueueSettingsWrite(async (): Promise<void> => {
        await updateAiPathsSettingsBulk([
          { key: AI_PATHS_UI_STATE_KEY, value: JSON.stringify(uiState) },
        ]);
      });
    },
    [core.enqueueSettingsWrite]
  );

  const persistUserPreferences = useCallback(
    async (activePathId: string | null): Promise<void> => {
      const prefs: AiPathsUserPreferences = {
        activePathId,
        updatedAt: new Date().toISOString(),
      };
      await core.enqueueSettingsWrite(async (): Promise<void> => {
        await updateAiPathsSettingsBulk([
          { key: 'user_preferences', value: JSON.stringify(prefs) },
        ]);
      });
    },
    [core.enqueueSettingsWrite]
  );

  const persistActivePathPreference = useCallback(
    async (pathId: string | null): Promise<void> => {
      try {
        await persistUserPreferences(pathId);
      } catch (error) {
        logClientError(error, {
          context: {
            source: 'useAiPathsPersistence',
            action: 'persistActivePathPreference',
            pathId,
          },
        });
      }
    },
    [persistUserPreferences]
  );

  const resolveUserPreferences = useCallback(
    (settings: AiPathsSettingRecord[]): AiPathsUserPreferences | null => {
    try {
      const prefsItem = settings.find((s) => s.key === 'user_preferences');
      if (!prefsItem?.value) return null;
      const parsed = JSON.parse(prefsItem.value) as AiPathsUserPreferences;
      const updatedAt = parsed.updatedAt ? Date.parse(parsed.updatedAt) : 0;
      if (Date.now() - updatedAt > USER_PREFERENCES_STALE_MS) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
    },
    []
  );

  return {
    persistUiState,
    persistUserPreferences,
    persistActivePathPreference,
    resolveUserPreferences,
    lastUiStatePayloadRef,
    lastUserPrefsActivePathIdRef,
  };
}
