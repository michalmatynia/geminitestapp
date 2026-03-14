'use client';

import React, { useState } from 'react';

import type { CmsThemeColors, CmsThemeTypography, CmsThemeSpacing } from '@/shared/contracts/cms';
import { Input, FormSection, FormField, FormActions } from '@/shared/ui';

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

const DEFAULT_COLORS: CmsThemeColors = {
  primary: '#3b82f6',
  secondary: '#6366f1',
  accent: '#f59e0b',
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f8fafc',
  muted: '#94a3b8',
};

const DEFAULT_TYPOGRAPHY: CmsThemeTypography = {
  headingFont: 'Inter, sans-serif',
  bodyFont: 'Inter, sans-serif',
  baseSize: 16,
  headingWeight: 700,
  bodyWeight: 400,
};

const DEFAULT_SPACING: CmsThemeSpacing = {
  sectionPadding: '64px',
  containerMaxWidth: '1200px',
};

export function ThemeForm(props: ThemeFormProps): React.JSX.Element {
  const { initialData, onSubmit, isSaving, onCancel, submitText } = props;

  const [name, setName] = useState(initialData?.name ?? '');
  const [colors, setColors] = useState<CmsThemeColors>(initialData?.colors ?? DEFAULT_COLORS);
  const [typography, setTypography] = useState<CmsThemeTypography>(
    initialData?.typography ?? DEFAULT_TYPOGRAPHY
  );
  const [spacing, setSpacing] = useState<CmsThemeSpacing>(initialData?.spacing ?? DEFAULT_SPACING);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    void onSubmit({ name, colors, typography, spacing });
  };

  const updateColor = (key: keyof CmsThemeColors, value: string): void => {
    setColors((prev: CmsThemeColors) => ({ ...prev, [key]: value }));
  };

  const colorKeys = Object.keys(colors) as Array<keyof CmsThemeColors>;

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
           aria-label="e.g. Modern Dark" title="e.g. Modern Dark"/>
        </FormField>
      </FormSection>

      <FormSection
        title='Colors'
        description='Brand and semantic colors for the theme.'
        gridClassName='grid-cols-2'
      >
        {colorKeys.map((key) => (
          <FormField key={key} label={key} className='capitalize'>
            <div className='flex items-center gap-2'>
              <input
                type='color'
                value={colors[key]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateColor(key, e.target.value)
                }
                className='h-9 w-10 cursor-pointer rounded border border-border/50 bg-transparent p-0.5'
                aria-label={`${key} color picker`}
                title={`${key} color picker`}
              />
              <Input
                value={colors[key]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateColor(key, e.target.value)
                }
                className='flex-1 text-xs font-mono'
                maxLength={7}
                aria-label={`${key} color value`}
                title={`${key} color value`}
              />
            </div>
          </FormField>
        ))}
      </FormSection>

      <FormSection
        title='Typography'
        description='Font families and weights.'
        gridClassName='grid-cols-2'
      >
        <FormField label='Heading Font'>
          <Input
            value={typography.headingFont}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setTypography((p: CmsThemeTypography) => ({ ...p, headingFont: e.target.value }))
            }
           aria-label="Heading Font" title="Heading Font"/>
        </FormField>
        <FormField label='Body Font'>
          <Input
            value={typography.bodyFont}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setTypography((p: CmsThemeTypography) => ({ ...p, bodyFont: e.target.value }))
            }
           aria-label="Body Font" title="Body Font"/>
        </FormField>
        <FormField label='Base Size (px)'>
          <Input
            type='number'
            value={typography.baseSize}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setTypography((p: CmsThemeTypography) => ({
                ...p,
                baseSize: Number(e.target.value),
              }))
            }
           aria-label="Base Size (px)" title="Base Size (px)"/>
        </FormField>
        <FormField label='Heading Weight'>
          <Input
            type='number'
            value={typography.headingWeight}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setTypography((p: CmsThemeTypography) => ({
                ...p,
                headingWeight: Number(e.target.value),
              }))
            }
            min={100}
            max={900}
            step={100}
           aria-label="Heading Weight" title="Heading Weight"/>
        </FormField>
        <FormField label='Body Weight' className='col-span-1'>
          <Input
            type='number'
            value={typography.bodyWeight}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setTypography((p: CmsThemeTypography) => ({
                ...p,
                bodyWeight: Number(e.target.value),
              }))
            }
            min={100}
            max={900}
            step={100}
           aria-label="Body Weight" title="Body Weight"/>
        </FormField>
      </FormSection>

      <FormSection
        title='Spacing'
        description='Layout dimensions and constraints.'
        gridClassName='grid-cols-2'
      >
        <FormField label='Section Padding'>
          <Input
            value={spacing.sectionPadding}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSpacing((p: CmsThemeSpacing) => ({ ...p, sectionPadding: e.target.value }))
            }
           aria-label="Section Padding" title="Section Padding"/>
        </FormField>
        <FormField label='Container Max Width'>
          <Input
            value={spacing.containerMaxWidth}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSpacing((p: CmsThemeSpacing) => ({ ...p, containerMaxWidth: e.target.value }))
            }
           aria-label="Container Max Width" title="Container Max Width"/>
        </FormField>
      </FormSection>

      <FormActions
        onCancel={onCancel}
        saveText={submitText}
        isSaving={isSaving}
        isDisabled={!name.trim()}
        className='pt-4'
      />
    </form>
  );
}
