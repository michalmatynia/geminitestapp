'use client';

import React from 'react';
import { Hint } from '@/shared/ui';
import { SettingsFieldsRenderer } from '@/shared/ui/templates/SettingsPanelBuilder';
import { useThemeSettings } from '../ThemeSettingsContext';
import { MiniRichTextEditor } from './MiniRichTextEditor';
import { ImagePickerField } from '../shared-fields';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';

export function ThemeBrandSection(): React.JSX.Element {
  const { theme, update } = useThemeSettings();

  const updateSetting = (key: keyof ThemeSettings) => (value: unknown) => {
    update(key, value as ThemeSettings[keyof ThemeSettings]);
  };

  return (
    <div className='space-y-4'>
      <SettingsFieldsRenderer
        fields={[
          {
            key: 'brandName',
            label: 'Brand name',
            type: 'text',
            placeholder: 'Your brand',
          },
          {
            key: 'brandTagline',
            label: 'Tagline',
            type: 'text',
            placeholder: 'Your tagline',
          },
          {
            key: 'brandEmail',
            label: 'Email',
            type: 'email',
            placeholder: 'hello@example.com',
          },
          {
            key: 'brandPhone',
            label: 'Phone',
            type: 'text',
            placeholder: '+1 234 567 890',
          },
          {
            key: 'brandAddress',
            label: 'Address',
            type: 'text',
            placeholder: '123 Main St',
          },
        ]}
        values={theme}
        onChange={(values) => {
          Object.entries(values).forEach(([key, value]) => {
            update(
              key as keyof ThemeSettings,
              value as unknown as ThemeSettings[keyof ThemeSettings]
            );
          });
        }}
      />
      <div className='border-t border-border/30 pt-2'>
        <Hint size='xxs' uppercase className='mb-2 block text-gray-500'>
          Footer description
        </Hint>
        <div className='space-y-3'>
          <MiniRichTextEditor
            label='Headline'
            value={theme.brandFooterHeadline}
            onChange={updateSetting('brandFooterHeadline')}
            minHeight='70px'
          />
          <MiniRichTextEditor
            label='Description'
            value={theme.brandFooterDescription}
            onChange={updateSetting('brandFooterDescription')}
            minHeight='140px'
            showFormatSelect
            enableLists
          />{' '}
          <ImagePickerField
            label='Image'
            value={theme.brandFooterImage}
            onChange={updateSetting('brandFooterImage')}
          />
          <SettingsFieldsRenderer
            fields={[
              {
                key: 'brandFooterImageWidth',
                label: 'Image width',
                type: 'range',
                min: 50,
                max: 550,
                suffix: 'px',
              },
            ]}
            values={theme}
            onChange={(values) =>
              update('brandFooterImageWidth', values.brandFooterImageWidth as number)
            }
          />
        </div>
      </div>
    </div>
  );
}
