'use client';

import React from 'react';

import type { CmsThemeColors, CmsThemeTypography, CmsThemeSpacing } from '@/shared/contracts/cms';
import { Input } from '@/shared/ui/primitives.public';
import { FormSection, FormField, FormActions } from '@/shared/ui/forms-and-actions.public';
import { ColorFields, TypographyFields, SpacingFields } from './ThemeFormFields';
import { useThemeForm } from './useThemeForm';


export type ThemeFormSubmitData = {
  name: string;
  colors: CmsThemeColors;
  typography: CmsThemeTypography;
  spacing: CmsThemeSpacing;
};

export interface ThemeFormProps {
  initialData?: {
    name: string;
    colors: CmsThemeColors;
    typography: CmsThemeTypography;
    spacing: CmsThemeSpacing;
  };
  onSubmit: (data: ThemeFormSubmitData) => Promise<void>;
  isSaving: boolean;
  onCancel: () => void;
  submitText: string;
}

export function ThemeForm(props: ThemeFormProps): React.JSX.Element {
  const { initialData, onSubmit, isSaving, onCancel, submitText } = props;
  const { name, setName, colors, typography, setTypography, spacing, setSpacing, updateColor } =
    useThemeForm(initialData);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    void onSubmit({ name, colors, typography, spacing });
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-8'>
      <FormSection title='General' description='Basic identification for this theme.'>
        <FormField label='Theme Name' required id='theme-name'>
          <Input
            id='theme-name'
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            placeholder='e.g. Modern Dark'
            required
            aria-label='e.g. Modern Dark'
            title='e.g. Modern Dark'
          />
        </FormField>
      </FormSection>

      <FormSection
        title='Colors'
        description='Brand and semantic colors for the theme.'
        gridClassName='grid-cols-2'
      >
        <ColorFields colors={colors} updateColor={updateColor} />
      </FormSection>

      <FormSection
        title='Typography'
        description='Font families and weights.'
        gridClassName='grid-cols-2'
      >
        <TypographyFields typography={typography} setTypography={setTypography} />
      </FormSection>

      <FormSection
        title='Spacing'
        description='Layout dimensions and constraints.'
        gridClassName='grid-cols-2'
      >
        <SpacingFields spacing={spacing} setSpacing={setSpacing} />
      </FormSection>

      <FormActions
        onCancel={onCancel}
        saveText={submitText}
        isSaving={isSaving}
        isDisabled={name.trim().length === 0}
        className='pt-4'
      />
    </form>
  );
}
