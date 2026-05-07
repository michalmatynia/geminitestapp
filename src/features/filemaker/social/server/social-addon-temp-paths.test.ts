import { describe, expect, it } from 'vitest';

import {
  SOCIAL_PUBLISHING_ADDON_TEMP_ROOT,
  resolveSocialPublishingAddonTempPath,
} from './social-addon-temp-paths';

describe('resolveSocialPublishingAddonTempPath', () => {
  it('resolves nested paths inside the approved temp root', () => {
    expect(resolveSocialPublishingAddonTempPath('captures/test.png')).toBe(
      `${SOCIAL_PUBLISHING_ADDON_TEMP_ROOT}/captures/test.png`
    );
  });

  it('rejects traversal outside the approved temp root', () => {
    expect(() => resolveSocialPublishingAddonTempPath('../escape.png')).toThrow(
      /invalid filesystem path access attempt/i
    );
    expect(() =>
      resolveSocialPublishingAddonTempPath(
        `${SOCIAL_PUBLISHING_ADDON_TEMP_ROOT}/../../escape.png`
      )
    ).toThrow(/invalid filesystem path access attempt/i);
  });
});
