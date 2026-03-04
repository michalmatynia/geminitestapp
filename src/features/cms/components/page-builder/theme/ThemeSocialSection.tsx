'use client';

import React from 'react';

import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import type { SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

import { ThemeSettingsFieldsSection } from './ThemeSettingsFieldsSection';

export function ThemeSocialSection(): React.JSX.Element {
  const fields: SettingsField<ThemeSettings>[] = [
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
  ];

  return <ThemeSettingsFieldsSection fields={fields} />;
}
