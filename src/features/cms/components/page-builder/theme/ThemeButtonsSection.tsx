'use client';

import React from 'react';

import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import type { SettingsPanelField } from '@/shared/contracts/ui';

import { WEIGHT_OPTIONS } from './theme-constants';
import { ThemeSettingsFieldsSection } from './ThemeSettingsFieldsSection';

export function ThemeButtonsSection(): React.JSX.Element {
  const fields: SettingsPanelField<ThemeSettings>[] = [
    { key: 'btnPaddingX', label: 'Padding X', type: 'number', min: 4, max: 48, suffix: 'px' },
    { key: 'btnPaddingY', label: 'Padding Y', type: 'number', min: 4, max: 24, suffix: 'px' },
    { key: 'btnFontSize', label: 'Font size', type: 'number', min: 10, max: 24, suffix: 'px' },
    { key: 'btnFontWeight', label: 'Font weight', type: 'select', options: WEIGHT_OPTIONS },
    { key: 'btnRadius', label: 'Radius', type: 'number', min: 0, max: 24, suffix: 'px' },

    {
      key: 'btnPrimaryBg',
      label: 'Primary Background',
      type: 'background',
      helperText: 'CSS color or gradient (e.g. #ff8a3d or linear-gradient(...)).',
    },
    { key: 'btnPrimaryText', label: 'Primary Text', type: 'color' },

    {
      key: 'btnSecondaryBg',
      label: 'Secondary Background',
      type: 'background',
      helperText: 'CSS color or gradient (e.g. #ffffff or linear-gradient(...)).',
    },
    { key: 'btnSecondaryText', label: 'Secondary Text', type: 'color' },

    { key: 'btnOutlineBorder', label: 'Outline border', type: 'color' },

    {
      key: 'btnBorderWidth',
      label: 'Border Thickness',
      type: 'number',
      min: 0,
      max: 8,
      suffix: 'px',
    },
    {
      key: 'btnBorderOpacity',
      label: 'Border Opacity',
      type: 'range',
      min: 0,
      max: 100,
      suffix: '%',
    },
    {
      key: 'btnBorderRadius',
      label: 'Border Corner radius',
      type: 'number',
      min: 0,
      max: 48,
      suffix: 'px',
    },

    {
      key: 'btnShadowOpacity',
      label: 'Shadow Opacity',
      type: 'range',
      min: 0,
      max: 100,
      suffix: '%',
    },
    {
      key: 'btnShadowX',
      label: 'Shadow Horizontal',
      type: 'number',
      min: -20,
      max: 20,
      suffix: 'px',
    },
    {
      key: 'btnShadowY',
      label: 'Shadow Vertical',
      type: 'number',
      min: -20,
      max: 20,
      suffix: 'px',
    },
    { key: 'btnShadowBlur', label: 'Shadow Blur', type: 'number', min: 0, max: 40, suffix: 'px' },
  ];

  return <ThemeSettingsFieldsSection fields={fields} />;
}
