'use client';

import React from 'react';

import { Label, Textarea } from '@/shared/ui';
import { SettingsFieldsRenderer } from '@/shared/ui/templates/SettingsPanelBuilder';

import { useThemeSettingsActions, useThemeSettingsValue } from '../ThemeSettingsContext';

export function ThemeCustomCssSection(): React.JSX.Element {
  const theme = useThemeSettingsValue();
  const { update } = useThemeSettingsActions();

  return (
    <div className='space-y-4'>
      <SettingsFieldsRenderer
        fields={[
          {
            key: 'customCssSelectors',
            label: 'CSS selectors',
            type: 'text',
            placeholder: '.product-card, #cart, .footer',
          },
        ]}
        values={theme}
        onChange={(values) => update('customCssSelectors', values.customCssSelectors as string)}
      />
      <div className='space-y-1.5'>
        <Label className='text-xs text-gray-400'>CSS Code</Label>
        <Textarea
          value={theme.customCss}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            update('customCss', e.target.value)
          }
          aria-label='CSS code'
          placeholder={'.my-class {\n  color: red;\n}'}
          className='w-full bg-card/40 p-2 font-mono text-xs text-gray-300 placeholder:text-gray-600 min-h-[120px]'
          spellCheck={false}
         title='.my-class {\n  color: red;\n}'/>
      </div>
    </div>
  );
}
