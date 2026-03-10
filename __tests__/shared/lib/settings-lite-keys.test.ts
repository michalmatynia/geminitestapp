import { describe, expect, it } from 'vitest';

import {
  FOLDER_TREE_PROFILE_V2_KEY_PREFIX,
  FOLDER_TREE_UI_STATE_V2_KEY_PREFIX,
} from '@/shared/contracts/master-folder-tree';
import { KANGUR_AI_TUTOR_APP_SETTINGS_KEY } from '@/shared/contracts/kangur-ai-tutor';
import { LITE_SETTINGS_KEYS, isLiteSettingsKey } from '@/shared/lib/settings-lite-keys';
import { folderTreeInstanceValues } from '@/shared/utils/folder-tree-profiles-v2';

describe('settings-lite-keys', () => {
  it('includes profile and ui-state keys for every folder tree instance', () => {
    folderTreeInstanceValues.forEach((instance) => {
      const uiStateKey = `${FOLDER_TREE_UI_STATE_V2_KEY_PREFIX}${instance}`;
      const profileKey = `${FOLDER_TREE_PROFILE_V2_KEY_PREFIX}${instance}`;

      expect(LITE_SETTINGS_KEYS).toContain(uiStateKey);
      expect(LITE_SETTINGS_KEYS).toContain(profileKey);
      expect(isLiteSettingsKey(uiStateKey)).toBe(true);
      expect(isLiteSettingsKey(profileKey)).toBe(true);
    });
  });

  it('includes Kangur AI tutor app settings so anonymous pages receive onboarding mode updates', () => {
    expect(LITE_SETTINGS_KEYS).toContain(KANGUR_AI_TUTOR_APP_SETTINGS_KEY);
    expect(isLiteSettingsKey(KANGUR_AI_TUTOR_APP_SETTINGS_KEY)).toBe(true);
  });
});
