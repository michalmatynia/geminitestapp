'use client';

import { useCallback } from 'react';

import type { PromptExploderSegmentationRecord } from '@/shared/contracts/prompt-exploder';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  PROMPT_EXPLODER_LIBRARY_KEY,
  type PromptExploderLibraryItem,
} from '../../prompt-library';
import { PROMPT_EXPLODER_SEGMENTATION_LIBRARY_KEY } from '../../segmentation-library';

import type { PromptExploderSettingsActions } from '../settings/SettingsActionsContext';
import type { PromptExploderSettingsState } from '../SettingsContext';

export const useLibraryPersistence = ({
  settingsMap,
  updateSetting,
}: {
  settingsMap: PromptExploderSettingsState['settingsMap'];
  updateSetting: PromptExploderSettingsActions['updateSetting'];
}) => {
  const persistPromptLibraryItems = useCallback(
    async (items: PromptExploderLibraryItem[]): Promise<boolean> => {
      const serialized = serializeSetting({ version: 1, items });
      if (settingsMap.get(PROMPT_EXPLODER_LIBRARY_KEY) === serialized) {
        return false;
      }
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_LIBRARY_KEY,
        value: serialized,
      });
      return true;
    },
    [settingsMap, updateSetting]
  );

  const persistSegmentationRecords = useCallback(
    async (records: PromptExploderSegmentationRecord[]): Promise<boolean> => {
      const serialized = serializeSetting({
        version: 1,
        records,
      });
      if (settingsMap.get(PROMPT_EXPLODER_SEGMENTATION_LIBRARY_KEY) === serialized) {
        return false;
      }
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SEGMENTATION_LIBRARY_KEY,
        value: serialized,
      });
      return true;
    },
    [settingsMap, updateSetting]
  );

  return {
    persistPromptLibraryItems,
    persistSegmentationRecords,
  };
};
