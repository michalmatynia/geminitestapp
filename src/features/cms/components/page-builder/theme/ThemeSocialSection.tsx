'use client';

import React from 'react';
import { SettingsFieldsRenderer } from '@/shared/ui/templates/SettingsPanelBuilder';
import { useThemeSettings } from '../ThemeSettingsContext';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';

type SocialSettings = Pick<
  ThemeSettings,
  | 'socialFacebook'
  | 'socialInstagram'
  | 'socialYoutube'
  | 'socialTiktok'
  | 'socialTwitter'
  | 'socialSnapchat'
  | 'socialPinterest'
  | 'socialTumblr'
  | 'socialVimeo'
  | 'socialLinkedin'
>;

export function ThemeSocialSection(): React.JSX.Element {
  const { theme, update } = useThemeSettings();
  const applyThemePatch = (values: Partial<SocialSettings>): void => {
    (Object.entries(values) as Array<[keyof SocialSettings, string | undefined]>).forEach(
      ([key, value]) => {
        if (value !== undefined) {
          update(key, value);
        }
      }
    );
  };

  return (
    <SettingsFieldsRenderer<SocialSettings>
      fields={[
        {
          key: 'socialFacebook',
          label: 'Facebook',
          type: 'text',
          placeholder: 'https://facebook.com/...',
        },
        {
          key: 'socialInstagram',
          label: 'Instagram',
          type: 'text',
          placeholder: 'https://instagram.com/...',
        },
        {
          key: 'socialYoutube',
          label: 'YouTube',
          type: 'text',
          placeholder: 'https://youtube.com/...',
        },
        {
          key: 'socialTiktok',
          label: 'TikTok',
          type: 'text',
          placeholder: 'https://tiktok.com/...',
        },
        {
          key: 'socialTwitter',
          label: 'X / Twitter',
          type: 'text',
          placeholder: 'https://x.com/...',
        },
        {
          key: 'socialSnapchat',
          label: 'Snapchat',
          type: 'text',
          placeholder: 'https://snapchat.com/add/...',
        },
        {
          key: 'socialPinterest',
          label: 'Pinterest',
          type: 'text',
          placeholder: 'https://pinterest.com/...',
        },
        {
          key: 'socialTumblr',
          label: 'Tumblr',
          type: 'text',
          placeholder: 'https://tumblr.com/...',
        },
        {
          key: 'socialVimeo',
          label: 'Vimeo',
          type: 'text',
          placeholder: 'https://vimeo.com/...',
        },
        {
          key: 'socialLinkedin',
          label: 'LinkedIn',
          type: 'text',
          placeholder: 'https://linkedin.com/...',
        },
      ]}
      values={theme}
      onChange={applyThemePatch}
    />
  );
}
