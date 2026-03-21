'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { CmsDomainSelector } from '@/features/cms/components/CmsDomainSelector';
import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import { useCmsAllSlugs, useCmsSlugs, useCreatePage } from '@/features/cms/hooks/useCmsQueries';
import { cmsPageCreateSchema } from '@/features/cms/validations/api';
import type { CmsPageCreateRequestDto, Slug } from '@/shared/contracts/cms';
import {
  AdminCmsBreadcrumbs,
  Alert,
  FormActions,
  FormField,
  FormSection,
  Input,
  SectionHeader,
  StatusBadge,
  SearchableList,
  ToggleRow,
} from '@/shared/ui';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { validateFormData } from '@/shared/validations/form-validation';

export default function CreatePagePage(): React.JSX.Element {
  const [name, setName] = useState('');
  const [slugIds, setSlugIds] = useState<string[]>([]);
  const router = useRouter();
  const { activeDomainId } = useCmsDomainSelection();
  const slugsQuery = useCmsSlugs(activeDomainId);
  const [includeAllZones, setIncludeAllZones] = useState(false);
  const allSlugsQuery = useCmsAllSlugs(includeAllZones);
  const createPage = useCreatePage();
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = (node: HTMLInputElement | null): void => {
    node?.focus();
  };

  const domainSlugs = useMemo(() => slugsQuery.data ?? [], [slugsQuery.data]);
  const allSlugs = allSlugsQuery.data ?? [];
  const domainSlugIds = useMemo(
    (): Set<string> => new Set(domainSlugs.map((slug: Slug) => slug.id)),
    [domainSlugs]
  );
  const visibleSlugs = includeAllZones ? allSlugs : domainSlugs;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const validation = validateFormData(
      cmsPageCreateSchema,
      { name, slugIds },
      'Page form is invalid.'
    );
    if (!validation.success) {
      setError(validation.firstError);
      return;
    }

    setError(null);
    try {
      const input: CmsPageCreateRequestDto = {
        ...validation.data,
        slugIds: validation.data.slugIds ?? [],
      };
      await createPage.mutateAsync(input);
      router.push('/admin/cms/pages');
    } catch (submitError: unknown) {
      logClientCatch(submitError, {
        source: 'CreatePagePage',
        action: 'createPage',
        name,
      });
      setError(submitError instanceof Error ? submitError.message : 'Failed to create page.');
    }
  };

  return (
    <div className='page-section max-w-3xl space-y-6'>
      <SectionHeader
        title='Create Page'
        description='Provision a new content page and map it to URL routes.'
        eyebrow={
          <AdminCmsBreadcrumbs
            parent={{ label: 'Pages', href: '/admin/cms/pages' }}
            current='Create'
            className='mb-2'
          />
        }
        actions={<CmsDomainSelector />}
      />

      <form
        onSubmit={(e: React.FormEvent<HTMLFormElement>): void => {
          void handleSubmit(e);
        }}
      >
        <div className='space-y-6'>
          {error && (
            <Alert variant='error' className='mb-6'>
              {error}
            </Alert>
          )}
          <FormSection title='General Information' className='p-6'>
            <FormField label='Page Name' error={error} required>
              <Input
                ref={nameInputRef}
                id='name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g. Summer Collection 2026'
                className='h-9'
               aria-label='e.g. Summer Collection 2026' title='e.g. Summer Collection 2026'/>
            </FormField>
          </FormSection>

          <FormSection
            title='Route Mapping'
            description='Select which URL paths should resolve to this page.'
            actions={
              <ToggleRow
                label='Show all zones'
                checked={includeAllZones}
                onCheckedChange={setIncludeAllZones}
                className='bg-transparent border-none p-0 hover:bg-transparent'
                labelClassName='text-[10px] uppercase font-bold text-gray-500'
              />
            }
            className='p-6'
          >
            <SearchableList
              items={visibleSlugs}
              selectedIds={slugIds}
              onToggle={(id) => {
                setSlugIds((prev) =>
                  prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
                );
              }}
              getId={(s: Slug) => s.id}
              getLabel={(s: Slug) => s.slug}
              searchPlaceholder='Filter available routes...'
              renderItem={(slug: Slug) => (
                <div className='flex flex-1 items-center justify-between'>
                  <span className='text-sm text-gray-300'>/{slug.slug}</span>
                  {includeAllZones && !domainSlugIds.has(slug.id) && (
                    <StatusBadge
                      status='Cross-Zone'
                      variant='warning'
                      size='sm'
                      className='font-bold'
                    />
                  )}
                </div>
              )}
            />
          </FormSection>

          <FormActions
            onCancel={() => router.back()}
            saveText='Create Page'
            isSaving={createPage.isPending}
            className='pt-4'
          />
        </div>
      </form>
    </div>
  );
}
