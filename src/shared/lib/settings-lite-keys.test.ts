import { describe, expect, it } from 'vitest';

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
    expect(isLiteSettingsKey('kangur_social_settings_v1')).toBe(true);
    expect(isLiteSettingsKey('product_images_external_base_url')).toBe(true);
    expect(isLiteSettingsKey('product_images_external_routes')).toBe(true);
    expect(isLiteSettingsKey('product_studio_sequence_generation_mode')).toBe(true);
  });
});
