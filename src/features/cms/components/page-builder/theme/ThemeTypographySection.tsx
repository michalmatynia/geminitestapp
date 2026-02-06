'use client';

import React from 'react';

import type { ThemeSettings } from '@/features/cms/types/theme-settings';

import {
  NumberField,
  RangeField,
  SelectField,
} from '../shared-fields';
import { FONT_OPTIONS, WEIGHT_OPTIONS } from './theme-constants';

export function ThemeTypographySection({
  theme,
  updateSetting,
}: {
  theme: ThemeSettings;
  updateSetting: <K extends keyof ThemeSettings>(key: K) => (value: ThemeSettings[K]) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-3">
      <NumberField label="Base size" value={theme.baseSize} onChange={updateSetting('baseSize')} suffix="px" min={12} max={24} />
      <SelectField label="Heading font" value={theme.headingFont} onChange={updateSetting('headingFont')} options={FONT_OPTIONS} />
      <RangeField label="Heading size scale" value={theme.headingSizeScale} onChange={updateSetting('headingSizeScale')} min={0.5} max={2} step={0.05} suffix="x" />
      <SelectField label="Heading weight" value={theme.headingWeight} onChange={updateSetting('headingWeight')} options={WEIGHT_OPTIONS} />
      <RangeField label="Heading line height" value={theme.headingLineHeight} onChange={updateSetting('headingLineHeight')} min={1} max={2} step={0.1} />
      <SelectField label="Body font" value={theme.bodyFont} onChange={updateSetting('bodyFont')} options={FONT_OPTIONS} />
      <RangeField label="Body size scale" value={theme.bodySizeScale} onChange={updateSetting('bodySizeScale')} min={0.5} max={2} step={0.05} suffix="x" />
      <SelectField label="Body weight" value={theme.bodyWeight} onChange={updateSetting('bodyWeight')} options={WEIGHT_OPTIONS} />
      <RangeField label="Body line height" value={theme.lineHeight} onChange={updateSetting('lineHeight')} min={1} max={2.5} step={0.1} />
    </div>
  );
}
