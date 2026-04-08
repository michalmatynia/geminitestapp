'use client';

import { useRouter, useParams } from 'next/navigation';
import React, { useMemo, useState, startTransition } from 'react';

import { ThemeForm, type ThemeFormSubmitData } from '@/features/cms/components/ThemeForm';
import { useCmsTheme, useUpdateTheme } from '@/features/cms/hooks/useCmsQueries';
import { cmsThemeUpdateSchema } from '@/features/cms/validations/api';
import type { CmsTheme, CmsThemeUpdateRequestDto } from '@/shared/contracts/cms';
import { AdminCmsPageLayout } from '@/shared/ui/admin.public';
import { Alert } from '@/shared/ui/primitives.public';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
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
      const input: CmsThemeUpdateRequestDto = {
        ...validation.data,
        customCss: validation.data.customCss ?? undefined,
      };
      await updateTheme.mutateAsync({ id, input });
      startTransition(() => { router.push('/admin/cms/themes'); });
    } catch (submitError: unknown) {
      logClientCatch(submitError, {
        source: 'EditThemePage',
        action: 'saveTheme',
        themeId: id,
      });
      setError(submitError instanceof Error ? submitError.message : 'Failed to save theme.');
    }
  };

  return (
    <AdminCmsPageLayout
      title='Edit Theme'
      current='Edit'
      parent={{ label: 'Themes', href: '/admin/cms/themes' }}
      description='Customize the visual design system for your storefront.'
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
        onCancel={() => startTransition(() => { router.push('/admin/cms/themes'); })}
        submitText='Save Changes'
      />
    </AdminCmsPageLayout>
  );
}

export default function EditThemePage(): React.JSX.Element {
  const params = useParams();
  const id = params['id'] as string;
  const themeQuery = useCmsTheme(id);

  if (themeQuery.isLoading) {
    return (
      <AdminCmsPageLayout
        title='Edit Theme'
        current='Edit'
        parent={{ label: 'Themes', href: '/admin/cms/themes' }}
        description='Loading theme configuration...'
      >
        <LoadingState message='Loading theme...' className='py-20' />
      </AdminCmsPageLayout>
    );
  }

  if (!themeQuery.data) {
    return (
      <AdminCmsPageLayout
        title='Edit Theme'
        current='Edit'
        parent={{ label: 'Themes', href: '/admin/cms/themes' }}
        description='Theme not found.'
      >
        <Alert variant='error' className='mt-10'>
          Theme not found. It might have been deleted or the ID is invalid.
        </Alert>
      </AdminCmsPageLayout>
    );
  }

  return <ThemeEditor theme={themeQuery.data} id={id} />;
}
