'use client';

import React from 'react';

import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { SettingsFieldsRenderer } from '@/shared/ui/templates/SettingsPanelBuilder';
import type { SettingsPanelField } from '@/shared/contracts/ui';
import { FormSection } from '@/shared/ui';

import {
  useOptionalThemeSettingsActions,
  useOptionalThemeSettingsValue,
} from '../ThemeSettingsContext';

interface ThemeSettingsFieldsSectionProps {
  fields: SettingsPanelField<ThemeSettings>[];
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  values?: ThemeSettings;
  onChange?: (values: ThemeSettings) => void;
  disabled?: boolean;
}

export function ThemeSettingsFieldsSection({
  fields,
  title,
  subtitle,
  values,
  onChange,
  disabled = false,
}: ThemeSettingsFieldsSectionProps): React.JSX.Element {
  const themeContext = useOptionalThemeSettingsValue();
  const actions = useOptionalThemeSettingsActions();
  const theme = values ?? themeContext;
  const rendererFields = React.useMemo(() => fields, [fields]);

  const handleChange = React.useCallback(
    (nextValues: Partial<ThemeSettings>): void => {
      if (onChange) {
        onChange({ ...(theme ?? ({} as ThemeSettings)), ...nextValues });
        return;
      }
      if (!actions) {
        return;
      }
      Object.entries(nextValues).forEach(([key, value]) => {
        if (value !== undefined) {
          actions.update(key as keyof ThemeSettings, value);
        }
      });
    },
    [actions, onChange, theme]
  );

  if (!theme) {
    throw new Error(
      'ThemeSettingsFieldsSection requires either ThemeSettingsProvider context or explicit values.'
    );
  }

  const content = (
    <SettingsFieldsRenderer
      fields={rendererFields}
      values={theme}
      onChange={handleChange}
      disabled={disabled}
    />
  );

  if (!title && !subtitle) {
    return content;
  }

  return (
    <FormSection title={title} subtitle={subtitle}>
      {content}
    </FormSection>
  );
}
