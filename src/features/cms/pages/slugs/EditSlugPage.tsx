'use client';

import { useRouter } from 'nextjs-toploader/app';
import { useParams, useSearchParams } from 'next/navigation';
import { useMemo, useState, startTransition } from 'react';

import { SlugForm, type SlugFormSubmitData } from '@/features/cms/components/SlugForm';
import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import {
  useCmsDomains,
  useCmsSlug,
  useCmsSlugDomains,
  useUpdateSlug,
  useUpdateSlugDomains,
} from '@/features/cms/hooks/useCmsQueries';
import { cmsSlugDomainsUpdateSchema, cmsSlugUpdateSchema } from '@/features/cms/validations/api';
import type { IdInputDto } from '@/shared/contracts/base';
import type { Slug } from '@/shared/contracts/cms';
import { AdminCmsPageLayout } from '@/shared/ui/admin.public';
import { Alert, useToast } from '@/shared/ui/primitives.public';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';
import { validateFormData } from '@/shared/validations/form-validation';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


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

    const updateData: IdInputDto<Partial<Slug>> & { domainId?: string | null } = {
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
      startTransition(() => { router.push(next); });
    } catch (err) {
      logClientError(err);
      setError(err instanceof Error ? err.message : 'Update failed.');
    }
  };

  return (
    <AdminCmsPageLayout
      title='Edit Route'
      current='Edit'
      parent={{ label: 'Slugs', href: '/admin/cms/slugs' }}
      description='Configure path behavior and cross-domain assignments.'
      containerClassName='page-section max-w-2xl space-y-6'
    >

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
    </AdminCmsPageLayout>
  );
}
