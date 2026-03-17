'use client';

import React from 'react';

import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import type { SettingsPanelField } from '@/shared/contracts/ui';

import { ThemeSettingsFieldsSection } from './ThemeSettingsFieldsSection';

export function ThemeLayoutSection(): React.JSX.Element {
  const fields: SettingsPanelField<ThemeSettings>[] = [
    { key: 'fullWidth', label: 'Full width page', type: 'checkbox' },
    {
      key: 'maxContentWidth',
      label: 'Max content width',
      type: 'range',
      min: 800,
      max: 1600,
      suffix: 'px',
    },
    { key: 'gridGutter', label: 'Grid gutter', type: 'range', min: 8, max: 48, suffix: 'px' },
    {
      key: 'sectionSpacing',
      label: 'Section spacing',
      type: 'range',
      min: 16,
      max: 128,
      suffix: 'px',
    },
    {
      key: 'containerPadding',
      label: 'Container padding',
      type: 'range',
      min: 8,
      max: 64,
      suffix: 'px',
    },

    { key: 'pagePaddingTop', label: 'Padding Top', type: 'number', min: 0, max: 200, suffix: 'px' },
    {
      key: 'pagePaddingRight',
      label: 'Padding Right',
      type: 'number',
      min: 0,
      max: 200,
      suffix: 'px',
    },
    {
      key: 'pagePaddingBottom',
      label: 'Padding Bottom',
      type: 'number',
      min: 0,
      max: 200,
      suffix: 'px',
    },
    {
      key: 'pagePaddingLeft',
      label: 'Padding Left',
      type: 'number',
      min: 0,
      max: 200,
      suffix: 'px',
    },

    { key: 'pageMarginTop', label: 'Margin Top', type: 'number', min: 0, max: 200, suffix: 'px' },
    {
      key: 'pageMarginRight',
      label: 'Margin Right',
      type: 'number',
      min: 0,
      max: 200,
      suffix: 'px',
    },
    {
      key: 'pageMarginBottom',
      label: 'Margin Bottom',
      type: 'number',
      min: 0,
      max: 200,
      suffix: 'px',
    },
    { key: 'pageMarginLeft', label: 'Margin Left', type: 'number', min: 0, max: 200, suffix: 'px' },

    {
      key: 'borderRadius',
      label: 'Page corner radius',
      type: 'range',
      min: 0,
      max: 40,
      suffix: 'px',
    },
  ];

  return <ThemeSettingsFieldsSection fields={fields} />;
}
