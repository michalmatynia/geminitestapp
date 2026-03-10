'use client';

import { useRouter, useParams } from 'next/navigation';
import React, { useMemo, useState } from 'react';

import { ThemeForm, type ThemeFormSubmitData } from '@/features/cms/components/ThemeForm';
import { useCmsTheme, useUpdateTheme } from '@/features/cms/hooks/useCmsQueries';
import { cmsThemeUpdateSchema } from '@/features/cms/validations/api';
import type { CmsTheme, CmsThemeUpdateInput } from '@/shared/contracts/cms';
import { PageLayout, Alert, LoadingState, Breadcrumbs } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { validateFormData } from '@/shared/validations/form-validation';

function ThemeEditor({ theme, id }: { theme: CmsTheme; id: string }): React.JSX.Element {
  const router = useRouter();
  const updateTheme = useUpdateTheme();
  const [error, setError] = useState<string | null>(null);
  const themeFormInitialData = useMemo(
    () => ({
      name: theme.name,
      colors: theme.colors,
      typography: theme.typography,
      spacing: theme.spacing,
    }),
    [theme]
  );

  const handleSubmit = async (data: ThemeFormSubmitData): Promise<void> => {
    const validation = validateFormData(cmsThemeUpdateSchema, data, 'Theme form is invalid.');
    if (!validation.success) {
      setError(validation.firstError);
      return;
    }

    setError(null);
    try {
      const validatedData = validation.data as CmsThemeUpdateInput;
      const input: CmsThemeUpdateInput = {
        ...validatedData,
        customCss: validatedData.customCss ?? undefined,
      };
      await updateTheme.mutateAsync({ id, input });
      router.push('/admin/cms/themes');
    } catch (submitError: unknown) {
      logClientError(submitError, {
        context: { source: 'EditThemePage', action: 'saveTheme', themeId: id },
      });
      setError(submitError instanceof Error ? submitError.message : 'Failed to save theme.');
    }
  };

  return (
    <PageLayout
      title='Edit Theme'
      description='Customize the visual design system for your storefront.'
      eyebrow={
        <Breadcrumbs
          items={[
            { label: 'Admin', href: '/admin' },
            { label: 'CMS', href: '/admin/cms' },
            { label: 'Themes', href: '/admin/cms/themes' },
            { label: 'Edit' },
          ]}
          className='mb-2'
        />
      }
    >
      {error ? (
        <Alert variant='error' className='mb-6'>
          {error}
        </Alert>
      ) : null}
      <ThemeForm
        initialData={themeFormInitialData}
        onSubmit={handleSubmit}
        isSaving={updateTheme.isPending}
        onCancel={() => router.push('/admin/cms/themes')}
        submitText='Save Changes'
      />
    </PageLayout>
  );
}

export default function EditThemePage(): React.JSX.Element {
  const params = useParams();
  const id = params['id'] as string;
  const themeQuery = useCmsTheme(id);

  if (themeQuery.isLoading) {
    return (
      <PageLayout title='Edit Theme' description='Loading theme configuration...'>
        <LoadingState message='Loading theme...' className='py-20' />
      </PageLayout>
    );
  }

  if (!themeQuery.data) {
    return (
      <PageLayout title='Edit Theme' description='Theme not found.'>
        <Alert variant='error' className='mt-10'>
          Theme not found. It might have been deleted or the ID is invalid.
        </Alert>
      </PageLayout>
    );
  }

  return <ThemeEditor theme={themeQuery.data} id={id} />;
}
