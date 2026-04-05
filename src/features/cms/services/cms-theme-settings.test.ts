import { describe, expect, it } from 'vitest';

import { __testOnly } from './cms-theme-settings';

describe('cms-theme-settings dev timeout', () => {
  it('uses a short fallback timeout in development by default', () => {
    expect(
      __testOnly.getCmsThemeSettingsReadTimeoutMs({
        NODE_ENV: 'development',
      } as NodeJS.ProcessEnv)
    ).toBe(150);
  });

  it('allows disabling the timeout explicitly', () => {
    expect(
      __testOnly.getCmsThemeSettingsReadTimeoutMs({
        NODE_ENV: 'development',
        CMS_THEME_SETTINGS_READ_TIMEOUT_MS: '0',
      } as NodeJS.ProcessEnv)
    ).toBeNull();
  });
});
