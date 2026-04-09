'use client';

import { useCallback, useRef } from 'react';

import { AI_PATHS_UI_STATE_KEY } from '@/shared/lib/ai-paths';
import {
  type AiPathsSettingRecord,
  updateAiPathsSettingsBulk,
} from '@/shared/lib/ai-paths/settings-store-client';
import {
  logClientCatch,
  logClientError,
} from '@/shared/utils/observability/client-error-logger';

import {
  USER_PREFERENCES_STALE_MS,
  type AiPathsUiState,
  type AiPathsUserPreferences,
  type UseAiPathsPersistenceArgs,
} from '../../useAiPathsPersistence.types';


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
        logClientCatch(error, {
          source: 'useAiPathsPersistence',
          action: 'persistActivePathPreference',
          pathId,
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
      } catch (error) {
        logClientError(error);
        return null;
      }
    },
    []
  );

  const resolveUiState = useCallback(
    (settings: AiPathsSettingRecord[]): AiPathsUiState | null => {
      try {
        const uiStateItem = settings.find((setting) => setting.key === AI_PATHS_UI_STATE_KEY);
        if (!uiStateItem?.value) return null;

        const parsed = JSON.parse(uiStateItem.value) as Partial<AiPathsUiState>;
        const expandedGroups = Array.isArray(parsed.expandedGroups)
          ? Array.from(
              new Set(
                parsed.expandedGroups
                  .filter((group): group is string => typeof group === 'string')
                  .map((group) => group.trim())
                  .filter((group) => group.length > 0)
              )
            ).sort()
          : undefined;
        const activePathId =
          parsed.activePathId === null
            ? null
            : typeof parsed.activePathId === 'string'
              ? (parsed.activePathId.trim() || null)
              : undefined;
        const paletteCollapsed =
          typeof parsed.paletteCollapsed === 'boolean' ? parsed.paletteCollapsed : undefined;
        const pathTreeVisible =
          typeof parsed.pathTreeVisible === 'boolean' ? parsed.pathTreeVisible : undefined;

        if (
          activePathId === undefined &&
          expandedGroups === undefined &&
          paletteCollapsed === undefined &&
          pathTreeVisible === undefined
        ) {
          return null;
        }

        return {
          ...(activePathId !== undefined ? { activePathId } : {}),
          ...(expandedGroups !== undefined ? { expandedGroups } : {}),
          ...(paletteCollapsed !== undefined ? { paletteCollapsed } : {}),
          ...(pathTreeVisible !== undefined ? { pathTreeVisible } : {}),
        };
      } catch (error) {
        logClientError(error);
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
    resolveUiState,
    lastUiStatePayloadRef,
    lastUserPrefsActivePathIdRef,
  };
}
