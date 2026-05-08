import { describe, expect, it } from 'vitest';

import { KANGUR_CMS_PROJECT_SETTING_KEY } from '@/features/kangur/cms-builder/project-contracts';
import { FILE_STORAGE_SOURCE_SETTING_KEY } from '@/shared/lib/files/constants';
import { LITE_SETTINGS_KEYS, isLiteSettingsKey } from '@/shared/lib/settings-lite-keys';

describe('settings-lite-keys', () => {
  it('includes the admin shell bootstrap keys', () => {
    expect(LITE_SETTINGS_KEYS).toContain('admin_menu_favorites');
    expect(LITE_SETTINGS_KEYS).toContain('admin_menu_section_colors');
    expect(LITE_SETTINGS_KEYS).toContain('admin_menu_custom_enabled');
    expect(LITE_SETTINGS_KEYS).toContain('admin_menu_custom_nav');
    expect(LITE_SETTINGS_KEYS).toContain('front_page_app');
  });

  it('includes the CMS, Social, and Products bootstrap keys used on slow admin routes', () => {
    expect(isLiteSettingsKey('cms_domain_settings.v1')).toBe(true);
    expect(isLiteSettingsKey('cms_theme_settings.v1')).toBe(true);
    expect(isLiteSettingsKey(KANGUR_CMS_PROJECT_SETTING_KEY)).toBe(true);
    expect(isLiteSettingsKey('social_publishing_settings_v1')).toBe(true);
    expect(isLiteSettingsKey('product_images_external_base_url')).toBe(true);
    expect(isLiteSettingsKey('product_images_external_routes')).toBe(true);
    expect(isLiteSettingsKey('product_studio_sequence_generation_mode')).toBe(true);
    expect(isLiteSettingsKey(FILE_STORAGE_SOURCE_SETTING_KEY)).toBe(true);
  });
});
