'use client';

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */

import { useRouter, useParams } from 'next/navigation';
import React, { useState } from 'react';

import { useCmsTheme, useUpdateTheme } from '@/features/cms/hooks/useCmsQueries';
import type {
  CmsTheme,
  CmsThemeColors,
  CmsThemeSpacing,
  CmsThemeTypography,
  CmsThemeUpdateInput,
} from '@/features/cms/types';
import { cmsThemeUpdateSchema } from '@/features/cms/validations/api';
import { logClientError } from '@/features/observability';
import { Button, Input, SectionHeader, FormSection, FormField } from '@/shared/ui';
import { validateFormData } from '@/shared/validations/form-validation';

function ThemeEditor({ theme, id }: { theme: CmsTheme; id: string }): React.JSX.Element {
  const router = useRouter();
  const updateTheme = useUpdateTheme();

  const [name, setName] = useState<string>(() => theme.name);
  const [colors, setColors] = useState<CmsThemeColors>(() => theme.colors);
  const [typography, setTypography] = useState<CmsThemeTypography>(() => theme.typography);
  const [spacing, setSpacing] = useState<CmsThemeSpacing>(() => theme.spacing);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const validation = validateFormData(
      cmsThemeUpdateSchema,
      { name, colors, typography, spacing },
      'Theme form is invalid.',
    );
    if (!validation.success) {
      setError(validation.firstError);
      return;
    }

    setError(null);
    try {
      const data = validation.data as CmsThemeUpdateInput;
      const input: CmsThemeUpdateInput = {
        name: data.name,
        ...(data.colors ? { colors: data.colors } : {}),
        ...(data.typography ? { typography: data.typography } : {}),
        ...(data.spacing ? { spacing: data.spacing } : {}),
      };
      await updateTheme.mutateAsync({ id, input });
      router.push('/admin/cms/themes');
    } catch (submitError: unknown) {
      logClientError(submitError, { context: { source: 'EditThemePage', action: 'saveTheme', themeId: id } });
      setError(submitError instanceof Error ? submitError.message : 'Failed to save theme.');
    }
  };

  const updateColor = (key: keyof CmsThemeColors, value: string): void => {
    setColors((prev: CmsThemeColors) => ({ ...prev, [key]: value }));
  };

  const colorKeys = Object.keys(colors) as Array<keyof CmsThemeColors>;

  return (
    <div className='container mx-auto max-w-2xl py-10'>
      <SectionHeader title='Edit Theme' className='mb-6' />
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
          <Button type='submit' size='lg' className='w-full md:w-auto min-w-[200px]' disabled={updateTheme.isPending || !name.trim()}>
            {updateTheme.isPending ? 'Saving...' : 'Save Theme'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function EditThemePage(): React.JSX.Element {
  const params = useParams();
  const id = params['id'] as string;
  const themeQuery = useCmsTheme(id);

  if (themeQuery.isLoading) {
    return (
      <div className='container mx-auto py-10'>
        <p className='text-gray-500 animate-pulse'>Loading theme...</p>
      </div>
    );
  }

  if (!themeQuery.data) {
    return (
      <div className='container mx-auto py-10'>
        <p className='text-red-500'>Theme not found.</p>
      </div>
    );
  }

  return <ThemeEditor theme={themeQuery.data} id={id} />;
}
