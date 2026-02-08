'use client';

import React from 'react';

import type { ThemeSettings } from '@/features/cms/types/theme-settings';
import { Label } from '@/shared/ui';

import {
  ColorField,
  NumberField,
  RangeField,
  SelectField,
} from '../shared-fields';
import { WEIGHT_OPTIONS } from './theme-constants';
import { useThemeSettings } from '../ThemeSettingsContext';

export function ThemeButtonsSection(): React.JSX.Element {
  const { theme, update } = useThemeSettings();

  const updateSetting = <K extends keyof ThemeSettings>(key: K): ((value: ThemeSettings[K]) => void) => {
    return (value: ThemeSettings[K]): void => {
      update(key, value);
    };
  };

  return (
    <div className='space-y-3'>
      <div className='grid grid-cols-2 gap-2'>
        <NumberField label='Padding X' value={theme.btnPaddingX} onChange={updateSetting('btnPaddingX')} suffix='px' min={4} max={48} />
        <NumberField label='Padding Y' value={theme.btnPaddingY} onChange={updateSetting('btnPaddingY')} suffix='px' min={4} max={24} />
      </div>
      <NumberField label='Font size' value={theme.btnFontSize} onChange={updateSetting('btnFontSize')} suffix='px' min={10} max={24} />
      <SelectField label='Font weight' value={theme.btnFontWeight} onChange={updateSetting('btnFontWeight')} options={WEIGHT_OPTIONS} />
      <NumberField label='Radius' value={theme.btnRadius} onChange={updateSetting('btnRadius')} suffix='px' min={0} max={24} />
      <div className='border-t border-border/30 pt-2'>
        <Label className='text-[10px] uppercase tracking-wider text-gray-500 mb-2 block'>Primary</Label>
        <div className='space-y-2'>
          <ColorField label='Background' value={theme.btnPrimaryBg} onChange={updateSetting('btnPrimaryBg')} />
          <ColorField label='Text' value={theme.btnPrimaryText} onChange={updateSetting('btnPrimaryText')} />
        </div>
      </div>
      <div className='border-t border-border/30 pt-2'>
        <Label className='text-[10px] uppercase tracking-wider text-gray-500 mb-2 block'>Secondary</Label>
        <div className='space-y-2'>
          <ColorField label='Background' value={theme.btnSecondaryBg} onChange={updateSetting('btnSecondaryBg')} />
          <ColorField label='Text' value={theme.btnSecondaryText} onChange={updateSetting('btnSecondaryText')} />
        </div>
      </div>
      <ColorField label='Outline border' value={theme.btnOutlineBorder} onChange={updateSetting('btnOutlineBorder')} />
      <div className='border-t border-border/30 pt-2'>
        <Label className='text-[10px] uppercase tracking-wider text-gray-500 mb-2 block'>Border</Label>
        <div className='space-y-2'>
          <NumberField label='Thickness' value={theme.btnBorderWidth} onChange={updateSetting('btnBorderWidth')} suffix='px' min={0} max={8} />
          <RangeField label='Opacity' value={theme.btnBorderOpacity} onChange={updateSetting('btnBorderOpacity')} min={0} max={100} suffix='%' />
          <NumberField label='Corner radius' value={theme.btnBorderRadius} onChange={updateSetting('btnBorderRadius')} suffix='px' min={0} max={48} />
        </div>
      </div>
      <div className='border-t border-border/30 pt-2'>
        <Label className='text-[10px] uppercase tracking-wider text-gray-500 mb-2 block'>Shadow</Label>
        <div className='space-y-2'>
          <RangeField label='Opacity' value={theme.btnShadowOpacity} onChange={updateSetting('btnShadowOpacity')} min={0} max={100} suffix='%' />
          <div className='grid grid-cols-3 gap-2'>
            <NumberField label='Horizontal' value={theme.btnShadowX} onChange={updateSetting('btnShadowX')} suffix='px' min={-20} max={20} />
            <NumberField label='Vertical' value={theme.btnShadowY} onChange={updateSetting('btnShadowY')} suffix='px' min={-20} max={20} />
            <NumberField label='Blur' value={theme.btnShadowBlur} onChange={updateSetting('btnShadowBlur')} suffix='px' min={0} max={40} />
          </div>
        </div>
      </div>
    </div>
  );
}
