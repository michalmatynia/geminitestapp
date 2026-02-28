import { describe, expect, it } from 'vitest';

import {
  IMAGE_STUDIO_PROJECT_SETTINGS_KEY_PREFIX,
  getImageStudioProjectSettingsKey,
  sanitizeImageStudioProjectIdForSettings,
} from '@/shared/lib/ai/image-studio/utils/studio-settings';

describe('studio-settings project key helpers', () => {
  it('sanitizes project id for settings key use', () => {
    expect(sanitizeImageStudioProjectIdForSettings(' Project/Main #1 ')).toBe('Project_Main__1');
  });

  it('returns null for empty project id', () => {
    expect(getImageStudioProjectSettingsKey('   ')).toBeNull();
    expect(getImageStudioProjectSettingsKey(null)).toBeNull();
    expect(getImageStudioProjectSettingsKey(undefined)).toBeNull();
  });

  it('builds deterministic project settings key', () => {
    expect(getImageStudioProjectSettingsKey(' Project/Main #1 ')).toBe(
      `${IMAGE_STUDIO_PROJECT_SETTINGS_KEY_PREFIX}Project_Main__1`
    );
  });
});
