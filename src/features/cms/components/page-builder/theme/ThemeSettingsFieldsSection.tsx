'use client';

import React from 'react';

import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import {
  SettingsFieldsRenderer,
  type SettingsField,
} from '@/shared/ui/templates/SettingsPanelBuilder';

import { useThemeSettingsActions, useThemeSettingsValue } from '../ThemeSettingsContext';

interface ThemeSettingsFieldsSectionProps {
  fields: SettingsField<ThemeSettings>[];
}

export function ThemeSettingsFieldsSection({
  fields,
}: ThemeSettingsFieldsSectionProps): React.JSX.Element {
  const theme = useThemeSettingsValue();
  const { update } = useThemeSettingsActions();
  const rendererFields = React.useMemo(() => fields, [fields]);

  const handleChange = React.useCallback(
    (values: Partial<ThemeSettings>): void => {
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined) {
          update(key as keyof ThemeSettings, value);
        }
      });
    },
    [update]
  );

  return <SettingsFieldsRenderer fields={rendererFields} values={theme} onChange={handleChange} />;
}
