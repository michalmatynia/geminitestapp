'use client';

import { useMemo } from 'react';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import {
  defaultTextEditorEngineProfiles,
  textEditorEngineSettingsMetaByInstance,
} from '../defaults';
import {
  getTextEditorProfileKey,
  parseTextEditorProfileEntry,
} from '../settings';
import { textEditorEngineInstanceValues } from '../types';

import type {
  TextEditorEngineInstance,
  TextEditorEngineProfile,
  TextEditorEngineProfilesMap,
  TextEditorEngineSettingsMeta,
} from '../types';

export function useTextEditorEngineProfiles(): TextEditorEngineProfilesMap {
  const settingsStore = useSettingsStore();

  const profileRawValues = textEditorEngineInstanceValues.map((instance: TextEditorEngineInstance) =>
    settingsStore.get(getTextEditorProfileKey(instance))
  );

  return useMemo(() => {
    const profiles = {} as TextEditorEngineProfilesMap;
    textEditorEngineInstanceValues.forEach((instance: TextEditorEngineInstance, index: number) => {
      const raw = profileRawValues[index];
      profiles[instance] =
        raw !== undefined
          ? parseTextEditorProfileEntry(instance, raw)
          : defaultTextEditorEngineProfiles[instance];
    });
    return profiles;
  }, [...profileRawValues]);
}

export function useTextEditorEngineProfile(
  instance: TextEditorEngineInstance
): TextEditorEngineProfile {
  const profiles = useTextEditorEngineProfiles();
  return profiles[instance];
}

export function useOptionalTextEditorEngineProfile(
  instance?: TextEditorEngineInstance | undefined
): TextEditorEngineProfile | null {
  const settingsStore = useSettingsStore();
  const raw = instance ? settingsStore.get(getTextEditorProfileKey(instance)) : undefined;

  return useMemo(() => {
    if (!instance) return null;
    if (raw === undefined) return defaultTextEditorEngineProfiles[instance];
    return parseTextEditorProfileEntry(instance, raw);
  }, [instance, raw]);
}

export const TEXT_EDITOR_INSTANCE_META: Array<{
  id: TextEditorEngineInstance;
  title: string;
  description: string;
}> = textEditorEngineInstanceValues.map((id: TextEditorEngineInstance) => {
  const meta: TextEditorEngineSettingsMeta = textEditorEngineSettingsMetaByInstance[id];
  return {
    id,
    title: meta.title,
    description: meta.description,
  };
});
