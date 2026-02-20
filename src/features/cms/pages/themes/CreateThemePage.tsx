'use client';

 

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { useCreateTheme } from '@/features/cms/hooks/useCmsQueries';
import type { CmsThemeColors, CmsThemeTypography, CmsThemeSpacing, CmsThemeCreateInput } from '@/shared/contracts/cms';
import { cmsThemeCreateSchema } from '@/features/cms/validations/api';
import { logClientError } from '@/features/observability';
import { Input, FormSection, FormField, PageLayout, Alert, FormActions, Breadcrumbs } from '@/shared/ui';
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
    <PageLayout
      title='Create Theme'
      description='Design a new visual system for your storefront.'
      eyebrow={
        <Breadcrumbs
          items={[
            { label: 'Admin', href: '/admin' },
            { label: 'CMS', href: '/admin/cms' },
            { label: 'Themes', href: '/admin/cms/themes' },
            { label: 'Create' }
          ]}
          className='mb-2'
        />
      }
    >
      <form onSubmit={(e: React.FormEvent) => { void handleSubmit(e); }} className='space-y-8'>
        {error ? (
          <Alert variant='error' className='mb-6'>
            {error}
          </Alert>
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

        <FormActions
          onCancel={() => router.push('/admin/cms/themes')}
          saveText='Create Theme'
          isSaving={createTheme.isPending}
          isDisabled={!name.trim()}
          className='pt-4'
        />
      </form>
    </PageLayout>
  );
}
