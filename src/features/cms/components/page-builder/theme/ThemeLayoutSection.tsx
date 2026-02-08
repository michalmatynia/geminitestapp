'use client';

import React from 'react';

import type { ThemeSettings } from '@/features/cms/types/theme-settings';
import { Label } from '@/shared/ui';

import {
  CheckboxField,
  NumberField,
  RangeField,
} from '../shared-fields';
import { useThemeSettings } from '../ThemeSettingsContext';

export function ThemeLayoutSection(): React.JSX.Element {
  const { theme, update } = useThemeSettings();

  const updateSetting = <K extends keyof ThemeSettings>(key: K): ((value: ThemeSettings[K]) => void) => {
    return (value: ThemeSettings[K]): void => {
      update(key, value);
    };
  };

  return (
    <div className='space-y-3'>
      <CheckboxField label='Full width page' checked={theme.fullWidth} onChange={updateSetting('fullWidth')} />
      <RangeField label='Max content width' value={theme.maxContentWidth} onChange={updateSetting('maxContentWidth')} min={800} max={1600} suffix='px' />
      <RangeField label='Grid gutter' value={theme.gridGutter} onChange={updateSetting('gridGutter')} min={8} max={48} suffix='px' />
      <RangeField label='Section spacing' value={theme.sectionSpacing} onChange={updateSetting('sectionSpacing')} min={16} max={128} suffix='px' />
      <RangeField label='Container padding' value={theme.containerPadding} onChange={updateSetting('containerPadding')} min={8} max={64} suffix='px' />
      <div className='space-y-2'>
        <Label className='text-[10px] uppercase tracking-wider text-gray-500'>Page padding (px)</Label>
        <div className='grid grid-cols-2 gap-2'>
          <NumberField label='Top' value={theme.pagePaddingTop} onChange={updateSetting('pagePaddingTop')} suffix='px' min={0} max={200} />
          <NumberField label='Right' value={theme.pagePaddingRight} onChange={updateSetting('pagePaddingRight')} suffix='px' min={0} max={200} />
          <NumberField label='Bottom' value={theme.pagePaddingBottom} onChange={updateSetting('pagePaddingBottom')} suffix='px' min={0} max={200} />
          <NumberField label='Left' value={theme.pagePaddingLeft} onChange={updateSetting('pagePaddingLeft')} suffix='px' min={0} max={200} />
        </div>
      </div>
      <div className='space-y-2'>
        <Label className='text-[10px] uppercase tracking-wider text-gray-500'>Page margin (px)</Label>
        <div className='grid grid-cols-2 gap-2'>
          <NumberField label='Top' value={theme.pageMarginTop} onChange={updateSetting('pageMarginTop')} suffix='px' min={0} max={200} />
          <NumberField label='Right' value={theme.pageMarginRight} onChange={updateSetting('pageMarginRight')} suffix='px' min={0} max={200} />
          <NumberField label='Bottom' value={theme.pageMarginBottom} onChange={updateSetting('pageMarginBottom')} suffix='px' min={0} max={200} />
          <NumberField label='Left' value={theme.pageMarginLeft} onChange={updateSetting('pageMarginLeft')} suffix='px' min={0} max={200} />
        </div>
      </div>
      <RangeField label='Page corner radius' value={theme.borderRadius} onChange={updateSetting('borderRadius')} min={0} max={40} suffix='px' />
    </div>
  );
}
