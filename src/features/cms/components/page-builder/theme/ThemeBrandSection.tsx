'use client';

import React from 'react';
import { Hint } from '@/shared/ui';
import { SettingsFieldsRenderer } from '@/shared/ui/templates/SettingsPanelBuilder';
import { useThemeSettings } from '../ThemeSettingsContext';
import { MiniRichTextEditor } from './MiniRichTextEditor';
import { ImagePickerField } from '../shared-fields';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';

type BrandIdentitySettings = Pick<
  ThemeSettings,
  'brandName' | 'brandTagline' | 'brandEmail' | 'brandPhone' | 'brandAddress'
>;

type BrandImageSettings = Pick<ThemeSettings, 'brandFooterImageWidth'>;

export function ThemeBrandSection(): React.JSX.Element {
  const { theme, update } = useThemeSettings();

  const applyThemePatch = <K extends keyof ThemeSettings>(
    values: Partial<Pick<ThemeSettings, K>>
  ): void => {
    (Object.entries(values) as Array<[K, ThemeSettings[K] | undefined]>).forEach(
      ([key, value]) => {
        if (value !== undefined) {
          update(key, value);
        }
      }
    );
  };

  const updateStringSetting =
    <
      K extends {
        [P in keyof ThemeSettings]-?: ThemeSettings[P] extends string ? P : never;
      }[keyof ThemeSettings],
    >(
      key: K
    ) =>
    (value: string): void => {
      update(key, value);
    };

  const handleBrandImageWidthChange = (values: Partial<BrandImageSettings>): void => {
    applyThemePatch(values);
  };

  return (
    <div className='space-y-4'>
      <SettingsFieldsRenderer<BrandIdentitySettings>
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
        onChange={applyThemePatch}
      />
      <div className='border-t border-border/30 pt-2'>
        <Hint size='xxs' uppercase className='mb-2 block text-gray-500'>
          Footer description
        </Hint>
        <div className='space-y-3'>
          <MiniRichTextEditor
            label='Headline'
            value={theme.brandFooterHeadline}
            onChange={updateStringSetting('brandFooterHeadline')}
            minHeight='70px'
          />
          <MiniRichTextEditor
            label='Description'
            value={theme.brandFooterDescription}
            onChange={updateStringSetting('brandFooterDescription')}
            minHeight='140px'
            showFormatSelect
            enableLists
          />
          <ImagePickerField
            label='Image'
            value={theme.brandFooterImage}
            onChange={updateStringSetting('brandFooterImage')}
          />
          <SettingsFieldsRenderer<BrandImageSettings>
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
            onChange={handleBrandImageWidthChange}
          />
        </div>
      </div>
    </div>
  );
}
