'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { ThemeForm, type ThemeFormSubmitData } from '@/features/cms/components/ThemeForm';
import { useCreateTheme } from '@/features/cms/hooks/useCmsQueries';
import { cmsThemeCreateSchema } from '@/features/cms/validations/api';
import { AdminCmsPageLayout } from '@/shared/ui/admin.public';
import { Alert } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { validateFormData } from '@/shared/validations/form-validation';

export default function CreateThemePage(): React.JSX.Element {
  const router = useRouter();
  const createTheme = useCreateTheme();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: ThemeFormSubmitData): Promise<void> => {
    const validation = validateFormData(cmsThemeCreateSchema, data, 'Theme form is invalid.');
    if (!validation.success) {
      setError(validation.firstError);
      return;
    }

    setError(null);
    try {
      await createTheme.mutateAsync(validation.data);
      router.push('/admin/cms/themes');
    } catch (submitError: unknown) {
      logClientCatch(submitError, {
        source: 'CreateThemePage',
        action: 'createTheme',
        name: data.name,
      });
      setError(submitError instanceof Error ? submitError.message : 'Failed to create theme.');
    }
  };

  return (
    <AdminCmsPageLayout
      title='Create Theme'
      current='Create'
      parent={{ label: 'Themes', href: '/admin/cms/themes' }}
      description='Design a new visual system for your storefront.'
    >
      {error ? (
        <Alert variant='error' className='mb-6'>
          {error}
        </Alert>
      ) : null}
      <ThemeForm
        onSubmit={handleSubmit}
        isSaving={createTheme.isPending}
        onCancel={() => router.push('/admin/cms/themes')}
        submitText='Create Theme'
      />
    </AdminCmsPageLayout>
  );
}
