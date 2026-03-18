import { describe, expect, it } from 'vitest';

import { getCmsMenuSettingsFallbackKeys } from '@/shared/contracts/cms-menu';

describe('cms menu multilingual keys', () => {
  it('prefers locale-scoped keys before legacy settings', () => {
    expect(getCmsMenuSettingsFallbackKeys('domain-1', 'de')).toEqual([
      'cms_menu_settings.v2.zone.domain-1.locale.de',
      'cms_menu_settings.v2.locale.de',
      'cms_menu_settings.v1.zone.domain-1',
      'cms_menu_settings.v1',
    ]);
  });

  it('keeps the legacy keys when no locale is requested', () => {
    expect(getCmsMenuSettingsFallbackKeys('domain-1')).toEqual([
      'cms_menu_settings.v1.zone.domain-1',
      'cms_menu_settings.v1',
    ]);
  });
});
