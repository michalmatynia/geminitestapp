'use client';

import { useCallback } from 'react';

import type { ClusterPreset, DbNodePreset, DbQueryPreset } from '@/shared/contracts/ai-paths';
import { CLUSTER_PRESETS_KEY, DB_QUERY_PRESETS_KEY, DB_NODE_PRESETS_KEY } from '@/shared/lib/ai-paths/core/constants';
import { updateAiPathsSettingsBulk } from '@/shared/lib/ai-paths/settings-store-client';

import type { PersistSettingsPayload } from '../../useAiPathsPersistence.types';

type PresetPersistence = {
  persistSettingsBulk: (payload: PersistSettingsPayload) => Promise<void>;
  saveClusterPresets: (presets: ClusterPreset[]) => Promise<void>;
  saveDbQueryPresets: (presets: DbQueryPreset[]) => Promise<void>;
  saveDbNodePresets: (presets: DbNodePreset[]) => Promise<void>;
};

export function usePresetPersistence(
  _args: unknown,
  core: {
    enqueueSettingsWrite: <T>(operation: () => Promise<T>) => Promise<T>;
    stringifyForStorage: (value: unknown, label: string) => string;
  }
): PresetPersistence {
  const persistSettingsBulk = useCallback(
    async (payload: PersistSettingsPayload): Promise<void> => {
      await core.enqueueSettingsWrite(async (): Promise<void> => {
        await updateAiPathsSettingsBulk(payload);
      });
    },
    [core]
  );

  const saveClusterPresets = useCallback(
    async (presets: ClusterPreset[]): Promise<void> => {
      await persistSettingsBulk([
        { key: CLUSTER_PRESETS_KEY, value: core.stringifyForStorage(presets, 'cluster presets') },
      ]);
    },
    [core, persistSettingsBulk]
  );

  const saveDbQueryPresets = useCallback(
    async (presets: DbQueryPreset[]): Promise<void> => {
      await persistSettingsBulk([
        { key: DB_QUERY_PRESETS_KEY, value: core.stringifyForStorage(presets, 'DB query presets') },
      ]);
    },
    [core, persistSettingsBulk]
  );

  const saveDbNodePresets = useCallback(
    async (presets: DbNodePreset[]): Promise<void> => {
      await persistSettingsBulk([
        { key: DB_NODE_PRESETS_KEY, value: core.stringifyForStorage(presets, 'DB node presets') },
      ]);
    },
    [core, persistSettingsBulk]
  );

  return {
    persistSettingsBulk,
    saveClusterPresets,
    saveDbQueryPresets,
    saveDbNodePresets,
  };
}
