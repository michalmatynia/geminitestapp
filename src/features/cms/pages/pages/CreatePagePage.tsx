'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { CmsDomainSelector } from '@/features/cms/components/CmsDomainSelector';
import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import { useCmsAllSlugs, useCmsSlugs, useCreatePage } from '@/features/cms/hooks/useCmsQueries';
import { cmsPageCreateSchema } from '@/features/cms/validations/api';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { Slug } from '@/shared/contracts/cms';
import {
  Input,
  SectionHeader,
  Checkbox,
  ToggleRow,
  FormSection,
  FormField,
  Badge,
  Alert,
  StatusBadge,
  FormActions,
  Hint,
  Breadcrumbs,
} from '@/shared/ui';
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
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const domainSlugs = useMemo(() => slugsQuery.data ?? [], [slugsQuery.data]);
  const allSlugs = allSlugsQuery.data ?? [];
  const domainSlugIds = useMemo(
    (): Set<string> => new Set(domainSlugs.map((slug: Slug) => slug.id)),
    [domainSlugs]
  );
  const visibleSlugs = includeAllZones ? allSlugs : domainSlugs;
  const filteredSlugs = visibleSlugs.filter((slug: Slug): boolean =>
    slug.slug.toLowerCase().includes(search.trim().toLowerCase())
  );

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
      await createPage.mutateAsync({
        name: validation.data.name,
        slugIds: validation.data.slugIds ?? [],
      });
      router.push('/admin/cms/pages');
    } catch (submitError: unknown) {
      logClientError(submitError, {
        context: { source: 'CreatePagePage', action: 'createPage', name },
      });
      setError(submitError instanceof Error ? submitError.message : 'Failed to create page.');
    }
  };

  return (
    <div className='container mx-auto py-10 max-w-3xl space-y-6'>
      <SectionHeader
        title='Create Page'
        description='Provision a new content page and map it to URL routes.'
        eyebrow={
          <Breadcrumbs
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'CMS', href: '/admin/cms' },
              { label: 'Pages', href: '/admin/cms/pages' },
              { label: 'Create' },
            ]}
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
                id='name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g. Summer Collection 2026'
                className='h-9'
                autoFocus
              />
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
            <div className='space-y-4'>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Filter available routes...'
                className='h-8 text-xs'
              />

              <div className='space-y-2'>
                <div className='flex justify-between items-center px-1'>
                  <Hint uppercase variant='muted' className='font-semibold'>
                    Available Slugs
                  </Hint>
                  <Badge variant='secondary' className='text-[9px]'>
                    {slugIds.length} selected
                  </Badge>
                </div>

                <div className='max-h-56 overflow-y-auto rounded border border-border/60 bg-black/20 p-2 divide-y divide-white/5'>
                  {filteredSlugs.length === 0 ? (
                    <div className='py-8 text-center text-xs text-gray-600'>
                      No routes found matching your criteria.
                    </div>
                  ) : (
                    filteredSlugs.map((slug) => {
                      const checked = slugIds.includes(slug.id);
                      const isCrossZone = includeAllZones && !domainSlugIds.has(slug.id);
                      return (
                        <label
                          key={slug.id}
                          className='flex items-center gap-3 p-2 hover:bg-white/5 cursor-pointer transition-colors'
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => {
                              setSlugIds((prev) =>
                                checked ? prev.filter((id) => id !== slug.id) : [...prev, slug.id]
                              );
                            }}
                          />
                          <div className='flex flex-1 items-center justify-between'>
                            <span className='text-sm text-gray-300'>/{slug.slug}</span>
                            {isCrossZone && (
                              <StatusBadge
                                status='Cross-Zone'
                                variant='warning'
                                size='sm'
                                className='font-bold'
                              />
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
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
