'use client';

import { useRouter, useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { CmsDomainSelector } from '@/features/cms';
import CmsEditorLayout from '@/features/cms/components/CmsEditorLayout';
import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import { useCmsAllSlugs, useCmsPage, useCmsSlugs, useUpdatePage } from '@/features/cms/hooks/useCmsQueries';
import type { Page, Slug } from '@/features/cms/types';
import { cmsPageUpdateSchema } from '@/features/cms/validations/api';
import { Button, Checkbox, Input, Label, SectionHeader, Switch } from '@/shared/ui';
import { validateFormData } from '@/shared/validations/form-validation';

export default function EditPagePageLoader(): React.JSX.Element {
  const { id } = useParams();
  const pageQuery = useCmsPage(id as string | undefined);

  if (pageQuery.isLoading || !pageQuery.data) {
    return <div>Loading...</div>;
  }

  return <EditPageContent key={pageQuery.data.id} initialPage={pageQuery.data} id={id as string} />;
}

function EditPageContent({ initialPage, id }: { initialPage: Page; id: string }): React.JSX.Element {
  const page = initialPage;
  const { activeDomainId } = useCmsDomainSelection();
  const slugsQuery = useCmsSlugs(activeDomainId);
  const allSlugsQuery = useCmsAllSlugs(true);
  const [search, setSearch] = useState('');
  const [includeAllZones, setIncludeAllZones] = useState(false);
  const [manualSelectedSlugIds, setManualSelectedSlugIds] = useState<string[] | null>(null);
  const router = useRouter();
  const updatePage = useUpdatePage();
  const [error, setError] = useState<string | null>(null);

  const allSlugs = useMemo((): Slug[] => allSlugsQuery.data ?? [], [allSlugsQuery.data]);
  const domainSlugs = useMemo((): Slug[] => slugsQuery.data ?? [], [slugsQuery.data]);
  const allSlugByValue = useMemo((): Map<string, { id: string; slug: string }> => {
    const map = new Map<string, { id: string; slug: string }>();
    allSlugs.forEach((slug: Slug): void => {
      map.set(slug.slug, { id: slug.id, slug: slug.slug });
    });
    return map;
  }, [allSlugs]);

  const normalizePageSlugValues = (slugs: Page['slugs']): string[] =>
    (slugs ?? []).map((slug): string => (typeof slug === 'string' ? slug : slug.slug));

  const initialSelectedSlugIds = useMemo((): string[] => {
    if (!allSlugs.length) return [];
    const pageSlugValues = normalizePageSlugValues(initialPage.slugs);
    return pageSlugValues
      .map((value: string) => allSlugByValue.get(value)?.id)
      .filter((value: string | undefined): value is string => Boolean(value));
  }, [allSlugs.length, allSlugByValue, initialPage.slugs]);

  const selectedSlugIds = manualSelectedSlugIds ?? initialSelectedSlugIds;

  const domainSlugIds = useMemo((): Set<string> => new Set(domainSlugs.map((slug: Slug) => slug.id)), [domainSlugs]);
  const selectedSlugs = useMemo((): Slug[] => {
    const byId = new Map(allSlugs.map((slug: Slug) => [slug.id, slug]));
    const isSlug = (value: Slug | undefined): value is Slug => Boolean(value);
    return selectedSlugIds.map((idValue: string) => byId.get(idValue)).filter(isSlug);
  }, [allSlugs, selectedSlugIds]);

  const crossZoneSlugs = useMemo(
    (): Slug[] => selectedSlugs.filter((slug: Slug) => !domainSlugIds.has(slug.id)),
    [selectedSlugs, domainSlugIds]
  );

  const filteredDomainSlugs = useMemo((): Slug[] => {
    const term = search.trim().toLowerCase();
    const base = includeAllZones ? allSlugs : domainSlugs;
    if (!term) return base;
    return base.filter((slug: Slug) => slug.slug.toLowerCase().includes(term));
  }, [domainSlugs, allSlugs, search, includeAllZones]);

  const handleSave = async (): Promise<void> => {
    if (!page) return;

    const validation = validateFormData(
      cmsPageUpdateSchema,
      {
        name: page.name,
        status: page.status,
        publishedAt: page.publishedAt ?? null,
        seoTitle: page.seoTitle ?? null,
        seoDescription: page.seoDescription ?? null,
        seoOgImage: page.seoOgImage ?? null,
        seoCanonical: page.seoCanonical ?? null,
        robotsMeta: page.robotsMeta ?? null,
        themeId: page.themeId ?? null,
        showMenu: page.showMenu ?? true,
        components: page.components,
        slugIds: selectedSlugIds,
      },
      'Page form is invalid.',
    );
    if (!validation.success) {
      setError(validation.firstError);
      return;
    }

    setError(null);
    await updatePage.mutateAsync({
      id,
      input: validation.data as Page & { slugIds?: string[] },
    });
    router.push('/admin/cms/pages');
  };

  return (
    <CmsEditorLayout>
      <div className='mx-auto flex w-full max-w-3xl flex-col gap-6 py-10'>
        <SectionHeader 
          title={page.name} 
          description='Map content to URL routes and manage cross-zone availability.'
          eyebrow='CMS · Editor'
          actions={
            <Button size='sm' onClick={(): void => { void handleSave(); }} disabled={updatePage.isPending}>
              {updatePage.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          }
        />

        {error && (
          <div className='rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300'>
            {error}
          </div>
        )}

        <div className='space-y-6'>
          <FormSection title='Context Selector' className='p-6'>
            <CmsDomainSelector />
          </FormSection>

          <FormSection 
            title='Route Configuration' 
            description='Select which URL paths should resolve to this page.'
            actions={
              <div className='flex items-center gap-2'>
                <Switch
                  id='slug-all-zones'
                  checked={includeAllZones}
                  onCheckedChange={setIncludeAllZones}
                />
                <label htmlFor='slug-all-zones' className='text-[10px] uppercase font-bold text-gray-500 cursor-pointer'>Show all zones</label>
              </div>
            }
            className='p-6'
          >
            <div className='space-y-4'>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Filter routes...'
                className='h-8 text-xs'
              />
              
              <div className='space-y-2'>
                <div className='flex justify-between items-center px-1'>
                  <span className='text-[10px] uppercase font-bold text-gray-500'>Available Slugs</span>
                  <Badge variant='secondary' className='text-[9px]'>{selectedSlugIds.length} selected</Badge>
                </div>

                <div className='max-h-64 overflow-y-auto rounded border border-border/60 bg-black/20 p-2 divide-y divide-white/5'>
                  {filteredDomainSlugs.length === 0 ? (
                    <div className='py-8 text-center text-xs text-gray-600'>No routes found matching your criteria.</div>
                  ) : (
                    filteredDomainSlugs.map((slug) => {
                      const checked = selectedSlugIds.includes(slug.id);
                      const isCrossZone = !domainSlugIds.has(slug.id);
                      return (
                        <label key={slug.id} className='flex items-center gap-3 p-2 hover:bg-white/5 cursor-pointer transition-colors'>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => {
                              setManualSelectedSlugIds((prev) => {
                                const current = prev ?? selectedSlugIds;
                                return checked
                                  ? current.filter((id) => id !== slug.id)
                                  : [...current, slug.id];
                              });
                            }}
                          />
                          <div className='flex flex-1 items-center justify-between'>
                            <span className='text-sm text-gray-300'>/{slug.slug}</span>
                            {isCrossZone && (
                              <Badge variant='outline' className='text-[8px] bg-amber-500/5 text-amber-400 border-amber-500/20'>Cross-Zone</Badge>
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

          {crossZoneSlugs.length > 0 && (
            <FormSection 
              title='External Assignments' 
              description='Routes from other zones currently pointing to this page.'
              className='p-6 border-amber-500/20'
            >
              <div className='flex flex-wrap gap-2'>
                {crossZoneSlugs.map((slug) => (
                  <button
                    key={slug.id}
                    type='button'
                    onClick={() =>
                      setManualSelectedSlugIds((prev) => {
                        const current = prev ?? selectedSlugIds;
                        return current.filter((id) => id !== slug.id);
                      })
                    }
                    className='group flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/5 px-3 py-1 text-[11px] text-amber-200 hover:bg-amber-500/10 transition-colors'
                  >
                    /{slug.slug}
                    <span className='text-amber-500 group-hover:text-amber-400'>×</span>
                  </button>
                ))}
              </div>
            </FormSection>
          )}
        </div>
      </div>
    </CmsEditorLayout>
  );
}
