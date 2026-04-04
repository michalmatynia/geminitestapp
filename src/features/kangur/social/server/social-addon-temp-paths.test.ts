import { describe, expect, it } from 'vitest';

import {
  KANGUR_SOCIAL_ADDON_TEMP_ROOT,
  resolveKangurSocialAddonTempPath,
} from './social-addon-temp-paths';

describe('resolveKangurSocialAddonTempPath', () => {
  it('resolves nested paths inside the approved temp root', () => {
    expect(resolveKangurSocialAddonTempPath('captures/test.png')).toBe(
      `${KANGUR_SOCIAL_ADDON_TEMP_ROOT}/captures/test.png`
    );
  });

  it('rejects traversal outside the approved temp root', () => {
    expect(() => resolveKangurSocialAddonTempPath('../escape.png')).toThrow(
      /invalid filesystem path access attempt/i
    );
    expect(() =>
      resolveKangurSocialAddonTempPath(
        `${KANGUR_SOCIAL_ADDON_TEMP_ROOT}/../../escape.png`
      )
    ).toThrow(/invalid filesystem path access attempt/i);
  });
});
