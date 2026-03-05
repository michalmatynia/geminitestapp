'use client';

import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import {
  useCmsDomains,
  useCmsSlug,
  useCmsSlugDomains,
  useUpdateSlug,
  useUpdateSlugDomains,
} from '@/features/cms/hooks/useCmsQueries';
import { cmsSlugDomainsUpdateSchema, cmsSlugUpdateSchema } from '@/features/cms/validations/api';
import type { Slug } from '@/shared/contracts/cms';
import { SectionHeader, useToast, LoadingState, Alert } from '@/shared/ui';
import { validateFormData } from '@/shared/validations/form-validation';
import { SlugForm, type SlugFormSubmitData } from '@/features/cms/components/SlugForm';

export default function EditSlugPageLoader(): React.JSX.Element {
  const params = useParams();
  const id = params['id'] as string;
  const searchParams = useSearchParams();
  const domainId = searchParams.get('domainId') ?? undefined;
  const slugQuery = useCmsSlug(id, domainId);

  if (slugQuery.isLoading || !slugQuery.data) {
    return <LoadingState message='Loading route configuration...' className='py-12' />;
  }

  return <EditSlugForm initialSlug={slugQuery.data} id={id} {...(domainId && { domainId })} />;
}

function EditSlugForm({
  initialSlug,
  id,
  domainId,
}: {
  initialSlug: Slug;
  id: string;
  domainId?: string;
}): React.JSX.Element {
  const { toast } = useToast();
  const { zoningEnabled } = useCmsDomainSelection();
  const domainsQuery = useCmsDomains();
  const slugDomainsQuery = useCmsSlugDomains(id);
  const updateSlugDomains = useUpdateSlugDomains();
  const router = useRouter();
  const updateSlug = useUpdateSlug();
  const [error, setError] = useState<string | null>(null);

  const domains = useMemo(() => domainsQuery.data ?? [], [domainsQuery.data]);
  const initialDomainIds = useMemo(
    () => slugDomainsQuery.data?.domainIds ?? [],
    [slugDomainsQuery.data]
  );
  const slugFormInitialData = useMemo(
    () => ({
      slug: initialSlug.slug,
      isDefault: Boolean(initialSlug.isDefault),
      domainIds: initialDomainIds,
    }),
    [initialSlug, initialDomainIds]
  );

  const handleSubmit = async (data: SlugFormSubmitData): Promise<void> => {
    setError(null);

    const slugValidation = validateFormData(
      cmsSlugUpdateSchema,
      {
        slug: data.slug,
        isDefault: data.isDefault,
      },
      'Slug form is invalid.'
    );
    if (!slugValidation.success) {
      setError(slugValidation.firstError);
      return;
    }

    if (zoningEnabled) {
      const domainsValidation = validateFormData(
        cmsSlugDomainsUpdateSchema,
        { domainIds: data.domainIds },
        'Assign this slug to at least one zone.'
      );
      if (!domainsValidation.success) {
        setError(domainsValidation.firstError);
        return;
      }
    }

    const updateData: { id: string; input: Partial<Slug>; domainId?: string | null } = {
      id,
      input: slugValidation.data as Partial<Slug>,
    };
    if (domainId) updateData.domainId = domainId;

    try {
      await updateSlug.mutateAsync(updateData);
      if (zoningEnabled) {
        await updateSlugDomains.mutateAsync({ id, domainIds: data.domainIds });
      }
      toast('Route path updated successfully.', { variant: 'success' });
      const next = domainId
        ? `/admin/cms/slugs?domainId=${encodeURIComponent(domainId)}`
        : '/admin/cms/slugs';
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    }
  };

  return (
    <div className='container mx-auto py-10 max-w-2xl space-y-6'>
      <SectionHeader
        title='Edit Route'
        description='Configure path behavior and cross-domain assignments.'
        eyebrow='CMS · Routing'
      />

      {error && (
        <Alert variant='error' className='mb-6'>
          {error}
        </Alert>
      )}

      <SlugForm
        initialData={slugFormInitialData}
        onSubmit={handleSubmit}
        isSaving={updateSlug.isPending || updateSlugDomains.isPending}
        onCancel={() => router.back()}
        submitText='Save Changes'
        domains={domains}
      />
    </div>
  );
}
