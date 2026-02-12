'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { CmsDomainSelector } from '@/features/cms';
import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import { useCmsAllSlugs, useCmsSlugs, useCreatePage } from '@/features/cms/hooks/useCmsQueries';
import type { Slug } from '@/features/cms/types';
import { cmsPageCreateSchema } from '@/features/cms/validations/api';
import { Button, Input, Label, SectionHeader, Checkbox, Switch } from '@/shared/ui';
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
  const domainSlugIds = useMemo((): Set<string> => new Set(domainSlugs.map((slug: Slug) => slug.id)), [domainSlugs]);
  const visibleSlugs = includeAllZones ? allSlugs : domainSlugs;
  const filteredSlugs = visibleSlugs.filter((slug: Slug): boolean =>
    slug.slug.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const validation = validateFormData(
      cmsPageCreateSchema,
      { name, slugIds },
      'Page form is invalid.',
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
      const { logClientError } = require('@/features/observability');
      logClientError(submitError, { context: { source: 'CreatePagePage', action: 'createPage', name } });
      setError(submitError instanceof Error ? submitError.message : 'Failed to create page.');
    }
  };

  return (
    <div className='container mx-auto py-10'>
      <SectionHeader title='Create Page' className='mb-6' />
      <div className='mb-6'>
        <CmsDomainSelector />
      </div>
      <form onSubmit={(e: React.FormEvent<HTMLFormElement>): void => { void handleSubmit(e); }}>
        {error ? (
          <div className='mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200'>
            {error}
          </div>
        ) : null}
        <div className='mb-4'>
          <Label htmlFor='name'>Page Name</Label>
          <Input
            id='name'
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setName(e.target.value)}
            required
          />
        </div>
        <div className='mb-4 space-y-2'>
          <div className='flex items-center justify-between'>
            <Label htmlFor='slug-search'>Slugs</Label>
            <div className='flex items-center gap-2 text-xs text-muted-foreground'>
              <Switch
                id='slug-all-zones'
                checked={includeAllZones}
                onCheckedChange={setIncludeAllZones}
              />
              <Label htmlFor='slug-all-zones'>All zones</Label>
            </div>
          </div>
          <Input
            id='slug-search'
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSearch(e.target.value)}
            placeholder='Search slugs...'
          />
          <div className='max-h-56 space-y-2 overflow-y-auto rounded border border-border/50 bg-gray-900/40 p-2'>
            {filteredSlugs.length === 0 ? (
              <p className='py-4 text-center text-xs text-gray-500'>
                No slugs available for this zone.
              </p>
            ) : (
              filteredSlugs.map((slug: Slug) => {
                const checked = slugIds.includes(slug.id);
                const isCrossZone = includeAllZones && !domainSlugIds.has(slug.id);
                return (
                  <label key={slug.id} className='flex items-center gap-2 text-sm text-gray-200'>
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => {
                        setSlugIds((prev: string[]): string[] =>
                          checked ? prev.filter((id: string): boolean => id !== slug.id) : [...prev, slug.id]
                        );
                      }}
                    />
                    <span>
                      /{slug.slug}
                      {isCrossZone ? (
                        <span className='ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200'>
                          Other zone
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })
            )}
          </div>
          <p className='text-xs text-gray-500'>{slugIds.length} selected</p>
        </div>
        <Button type='submit'>Create</Button>
      </form>
    </div>
  );
}
