'use client';

import React from 'react';

import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import type { SettingsPanelField } from '@/shared/ui/templates/SettingsPanelBuilder';

import { FONT_OPTIONS, WEIGHT_OPTIONS } from './theme-constants';
import { ThemeSettingsFieldsSection } from './ThemeSettingsFieldsSection';

export function ThemeTypographySection(): React.JSX.Element {
  const fields: SettingsPanelField<ThemeSettings>[] = [
    { key: 'baseSize', label: 'Base size', type: 'number', min: 12, max: 24, suffix: 'px' },
    { key: 'headingFont', label: 'Heading font', type: 'select', options: FONT_OPTIONS },
    {
      key: 'headingSizeScale',
      label: 'Heading size scale',
      type: 'range',
      min: 0.5,
      max: 2,
      step: 0.05,
      suffix: 'x',
    },
    { key: 'headingWeight', label: 'Heading weight', type: 'select', options: WEIGHT_OPTIONS },
    {
      key: 'headingLineHeight',
      label: 'Heading line height',
      type: 'range',
      min: 1,
      max: 2,
      step: 0.1,
    },
    { key: 'bodyFont', label: 'Body font', type: 'select', options: FONT_OPTIONS },
    {
      key: 'bodySizeScale',
      label: 'Body size scale',
      type: 'range',
      min: 0.5,
      max: 2,
      step: 0.05,
      suffix: 'x',
    },
    { key: 'bodyWeight', label: 'Body weight', type: 'select', options: WEIGHT_OPTIONS },
    { key: 'lineHeight', label: 'Body line height', type: 'range', min: 1, max: 2.5, step: 0.1 },
  ];

  return <ThemeSettingsFieldsSection fields={fields} />;
}
