'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { SlugForm, type SlugFormSubmitData } from '@/features/cms/components/SlugForm';
import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import {
  useCmsDomains,
  useCreateSlug,
  useUpdateSlugDomains,
} from '@/features/cms/hooks/useCmsQueries';
import { AdminCmsBreadcrumbs, Alert, SectionHeader, useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export default function CreateSlugPage(): React.JSX.Element {
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const domainId = searchParams.get('domainId') ?? undefined;
  const createSlug = useCreateSlug();
  const updateSlugDomains = useUpdateSlugDomains();
  const domainsQuery = useCmsDomains();
  const { zoningEnabled } = useCmsDomainSelection();

  const domains = useMemo(() => domainsQuery.data ?? [], [domainsQuery.data]);

  const handleSubmit = async (data: SlugFormSubmitData): Promise<void> => {
    setError(null);

    try {
      const createData: { slug: string; domainId?: string | null } = { slug: data.slug };
      if (domainId) createData.domainId = domainId;

      const newSlug = await createSlug.mutateAsync(createData);

      if (zoningEnabled && data.domainIds.length > 0) {
        await updateSlugDomains.mutateAsync({ id: newSlug.id, domainIds: data.domainIds });
      }

      toast('Route path created successfully.', { variant: 'success' });
      const next = domainId
        ? `/admin/cms/slugs?domainId=${encodeURIComponent(domainId)}`
        : '/admin/cms/slugs';
      router.push(next);
    } catch (err: unknown) {
      logClientError(err, {
        context: { source: 'CreateSlugPage', action: 'createSlug', slug: data.slug, domainId },
      });
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  };

  return (
    <div className='container mx-auto py-10 max-w-2xl space-y-6'>
      <SectionHeader
        title='Create Route'
        description='Register a new URL path for your content.'
        eyebrow={
          <AdminCmsBreadcrumbs
            parent={{ label: 'Slugs', href: '/admin/cms/slugs' }}
            current='Create'
            className='mb-2'
          />
        }
      />

      {error && (
        <Alert variant='error' className='mb-6'>
          {error}
        </Alert>
      )}

      <SlugForm
        onSubmit={handleSubmit}
        isSaving={createSlug.isPending || updateSlugDomains.isPending}
        onCancel={() => router.back()}
        submitText='Create Path'
        domains={domains}
        initialData={domainId ? { slug: '', isDefault: false, domainIds: [domainId] } : undefined}
      />
    </div>
  );
}
