'use client';

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { useCreateTheme } from '@/features/cms/hooks/useCmsQueries';
import type { CmsThemeColors, CmsThemeTypography, CmsThemeSpacing, CmsThemeCreateInput } from '@/features/cms/types';
import { cmsThemeCreateSchema } from '@/features/cms/validations/api';
import { logClientError } from '@/features/observability';
import { Button, Input, SectionHeader, FormSection, FormField } from '@/shared/ui';
import { validateFormData } from '@/shared/validations/form-validation';

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

export default function CreateThemePage(): React.ReactNode {
  const router = useRouter();
  const createTheme = useCreateTheme();

  const [name, setName] = useState('');
  const [colors, setColors] = useState<CmsThemeColors>(DEFAULT_COLORS);
  const [typography, setTypography] = useState<CmsThemeTypography>(DEFAULT_TYPOGRAPHY);
  const [spacing, setSpacing] = useState<CmsThemeSpacing>(DEFAULT_SPACING);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const validation = validateFormData(
      cmsThemeCreateSchema,
      { name, colors, typography, spacing },
      'Theme form is invalid.',
    );
    if (!validation.success) {
      setError(validation.firstError);
      return;
    }

    setError(null);
    try {
      const data = validation.data as CmsThemeCreateInput;
      await createTheme.mutateAsync(data);
      router.push('/admin/cms/themes');
    } catch (submitError: unknown) {
      logClientError(submitError, { context: { source: 'CreateThemePage', action: 'createTheme', name } });
      setError(submitError instanceof Error ? submitError.message : 'Failed to create theme.');
    }
  };

  const updateColor = (key: keyof CmsThemeColors, value: string): void => {
    setColors((prev: CmsThemeColors) => ({ ...prev, [key]: value }));
  };

  const colorKeys = Object.keys(colors) as Array<keyof CmsThemeColors>;

  return (
    <div className='container mx-auto max-w-2xl py-10'>
      <SectionHeader title='Create Theme' className='mb-6' />
      <form onSubmit={(e: React.FormEvent) => { void handleSubmit(e); }} className='space-y-8'>
        {error ? (
          <div className='rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200'>
            {error}
          </div>
        ) : null}
        <FormSection title='General' description='Basic identification for this theme.'>
          <FormField label='Theme Name' required id='theme-name'>
            <Input
              id='theme-name'
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              placeholder='e.g. Modern Dark'
              required
            />
          </FormField>
        </FormSection>

        <FormSection title='Colors' description='Brand and semantic colors for the theme.' gridClassName='grid-cols-2'>
          {colorKeys.map((key) => (
            <FormField key={key} label={key} className='capitalize'>
              <div className='flex items-center gap-2'>
                <input
                  type='color'
                  value={colors[key]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateColor(key, e.target.value)}
                  className='h-9 w-10 cursor-pointer rounded border border-border/50 bg-transparent p-0.5'
                />
                <Input
                  value={colors[key]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateColor(key, e.target.value)}
                  className='flex-1 text-xs font-mono'
                  maxLength={7}
                />
              </div>
            </FormField>
          ))}
        </FormSection>

        <FormSection title='Typography' description='Font families and weights.' gridClassName='grid-cols-2'>
          <FormField label='Heading Font'>
            <Input
              value={typography.headingFont}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTypography((p: CmsThemeTypography) => ({ ...p, headingFont: e.target.value }))}
            />
          </FormField>
          <FormField label='Body Font'>
            <Input
              value={typography.bodyFont}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTypography((p: CmsThemeTypography) => ({ ...p, bodyFont: e.target.value }))}
            />
          </FormField>
          <FormField label='Base Size (px)'>
            <Input
              type='number'
              value={typography.baseSize}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTypography((p: CmsThemeTypography) => ({ ...p, baseSize: Number(e.target.value) }))}
            />
          </FormField>
          <FormField label='Heading Weight'>
            <Input
              type='number'
              value={typography.headingWeight}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTypography((p: CmsThemeTypography) => ({ ...p, headingWeight: Number(e.target.value) }))}
              min={100}
              max={900}
              step={100}
            />
          </FormField>
          <FormField label='Body Weight' className='col-span-1'>
            <Input
              type='number'
              value={typography.bodyWeight}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTypography((p: CmsThemeTypography) => ({ ...p, bodyWeight: Number(e.target.value) }))}
              min={100}
              max={900}
              step={100}
            />
          </FormField>
        </FormSection>

        <FormSection title='Spacing' description='Layout dimensions and constraints.' gridClassName='grid-cols-2'>
          <FormField label='Section Padding'>
            <Input
              value={spacing.sectionPadding}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpacing((p: CmsThemeSpacing) => ({ ...p, sectionPadding: e.target.value }))}
            />
          </FormField>
          <FormField label='Container Max Width'>
            <Input
              value={spacing.containerMaxWidth}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpacing((p: CmsThemeSpacing) => ({ ...p, containerMaxWidth: e.target.value }))}
            />
          </FormField>
        </FormSection>

        <div className='pt-4'>
          <Button type='submit' size='lg' className='w-full md:w-auto min-w-[200px]' disabled={createTheme.isPending || !name.trim()}>
            {createTheme.isPending ? 'Creating...' : 'Create Theme'}
          </Button>
        </div>
      </form>
    </div>
  );
}
