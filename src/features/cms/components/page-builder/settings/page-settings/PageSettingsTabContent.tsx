'use client';

import React, { useMemo, useState } from 'react';
import { Button, Input, Label, Checkbox, Badge, ToggleRow, SegmentedControl } from '@/shared/ui';
import { usePageBuilder } from '../../../../hooks/usePageBuilderContext';
import { useCmsDomainSelection } from '../../../../hooks/useCmsDomainSelection';
import { useCmsSlugs, useUpdateSlug } from '../../../../hooks/useCmsQueries';
import { useUserPreferences, useUpdateUserPreferences } from '@/shared/hooks/useUserPreferences';
import type { PageStatus, Slug } from '../../../../types';
import { normalizePageSlugValues } from '../../../../utils/slug-utils';

const STATUS_OPTIONS: { label: string; value: PageStatus }[] = [
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
];

export function PageSettingsTabContent({ allSlugs }: { allSlugs: Slug[] }): React.JSX.Element {
  const { state, dispatch } = usePageBuilder();
  const page = state.currentPage!;
  const { activeDomainId } = useCmsDomainSelection();
  const slugsQuery = useCmsSlugs(activeDomainId);
  const updateSlug = useUpdateSlug();
  const [search, setSearch] = useState('');
  const preferencesQuery = useUserPreferences();
  const userPreferences = preferencesQuery.data;
  const updatePreferencesMutation = useUpdateUserPreferences();
  const [userPreviewDraftsEnabled, setUserPreviewDraftsEnabled] = useState<boolean | null>(null);
  const [userPauseSlideshowOnHoverInEditor, setUserPauseSlideshowOnHoverInEditor] = useState<
    boolean | null
  >(null);

  const domainSlugs = useMemo((): Slug[] => slugsQuery.data ?? [], [slugsQuery.data]);
  const allSlugByValue = useMemo((): Map<string, Slug> => {
    const map = new Map<string, Slug>();
    allSlugs.forEach((slug: Slug) => map.set(slug.slug, slug));
    return map;
  }, [allSlugs]);

  const selectedSlugIds = useMemo((): string[] => {
    const pageSlugValues = normalizePageSlugValues(page.slugs);
    return pageSlugValues
      .map((value: string) => allSlugByValue.get(value)?.id)
      .filter((value: string | undefined): value is string => Boolean(value));
  }, [page.slugs, allSlugByValue]);

  const domainSlugIds = useMemo(
    (): Set<string> => new Set(domainSlugs.map((slug: Slug) => slug.id)),
    [domainSlugs]
  );
  const selectedSlugs = useMemo((): Slug[] => {
    const byId = new Map(allSlugs.map((slug: Slug) => [slug.id, slug]));
    return selectedSlugIds
      .map((idValue: string) => byId.get(idValue))
      .filter((value: Slug | undefined): value is Slug => Boolean(value));
  }, [allSlugs, selectedSlugIds]);

  const crossZoneSlugs = useMemo(
    (): Slug[] => selectedSlugs.filter((slug: Slug) => !domainSlugIds.has(slug.id)),
    [selectedSlugs, domainSlugIds]
  );
  const eligibleHomeSlugs = useMemo(
    (): Slug[] => selectedSlugs.filter((slug: Slug) => domainSlugIds.has(slug.id)),
    [selectedSlugs, domainSlugIds]
  );
  const currentHomeSlug = useMemo(
    (): Slug | null => domainSlugs.find((slug: Slug) => slug.isDefault) ?? null,
    [domainSlugs]
  );
  const pageHomeSlug = useMemo(
    (): Slug | null =>
      currentHomeSlug
        ? (eligibleHomeSlugs.find((slug: Slug) => slug.id === currentHomeSlug.id) ?? null)
        : null,
    [currentHomeSlug, eligibleHomeSlugs]
  );

  const filteredDomainSlugs = useMemo((): Slug[] => {
    const term = search.trim().toLowerCase();
    if (!term) return domainSlugs;
    return domainSlugs.filter((slug: Slug) => slug.slug.toLowerCase().includes(term));
  }, [domainSlugs, search]);

  const handleStatusChange = (status: PageStatus): void => {
    dispatch({ type: 'SET_PAGE_STATUS', status });
  };

  const handleMenuVisibilityChange = (checked: boolean): void => {
    dispatch({ type: 'SET_PAGE_MENU_VISIBILITY', showMenu: checked });
  };

  const showMenuValue = page.showMenu !== false;
  const previewDraftsEnabled =
    userPreviewDraftsEnabled ?? Boolean(userPreferences?.cmsPreviewEnabled);
  const pauseSlideshowOnHoverInEditor =
    userPauseSlideshowOnHoverInEditor ?? Boolean(userPreferences?.cmsSlideshowPauseOnHoverInEditor);

  const applySelectedSlugIds = (ids: string[]): void => {
    const selectedSlugsList = ids
      .map((idValue: string) => allSlugs.find((slug: Slug) => slug.id === idValue))
      .filter((value: Slug | undefined): value is Slug => Boolean(value));
    dispatch({
      type: 'UPDATE_PAGE_SLUGS',
      slugIds: ids,
      slugValues: selectedSlugsList.map((slug: Slug) => slug.slug),
    });
  };

  const handleToggleSlug = (slug: Slug): void => {
    const nextIds = selectedSlugIds.includes(slug.id)
      ? selectedSlugIds.filter((idValue: string) => idValue !== slug.id)
      : [...selectedSlugIds, slug.id];
    applySelectedSlugIds(nextIds);
  };

  const handleRemoveSlug = (slug: Slug): void => {
    applySelectedSlugIds(selectedSlugIds.filter((idValue: string) => idValue !== slug.id));
  };

  const handleSetHome = async (slug: Slug): Promise<void> => {
    await updateSlug.mutateAsync({
      id: slug.id,
      input: { slug: slug.slug, isDefault: true },
      domainId: activeDomainId,
    });
  };

  const handleDraftPreviewChange = (value: boolean | 'indeterminate'): void => {
    const next = value === true;
    setUserPreviewDraftsEnabled(next);
    updatePreferencesMutation.mutate({ cmsPreviewEnabled: next });
  };

  const handlePauseSlidesOnHoverChange = (value: boolean | 'indeterminate'): void => {
    const next = value === true;
    setUserPauseSlideshowOnHoverInEditor(next);
    updatePreferencesMutation.mutate({ cmsSlideshowPauseOnHoverInEditor: next });
  };

  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Status</Label>
        <SegmentedControl
          value={page.status}
          onChange={(value: string) => handleStatusChange(value as PageStatus)}
          options={STATUS_OPTIONS}
          size='sm'
          className='w-full'
        />
        {page.publishedAt && page.status === 'published' && (
          <p className='text-[10px] text-gray-500'>
            Published: {new Date(page.publishedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className='space-y-2'>
        <ToggleRow
          variant='switch'
          label='Global Menu'
          description='Show the global navigation menu on this page.'
          checked={showMenuValue}
          onCheckedChange={handleMenuVisibilityChange}
          className='border-none p-0 bg-transparent hover:bg-transparent'
        />
      </div>

      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Slugs for this zone</Label>
        <Input
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSearch(e.target.value)}
          placeholder='Search slugs...'
          className='h-8 text-xs'
        />
        <div className='max-h-48 space-y-2 overflow-y-auto rounded border border-border/40 bg-gray-900/40 p-2'>
          {filteredDomainSlugs.length === 0 ? (
            <p className='py-4 text-center text-xs text-gray-500'>
              No slugs available for this zone.
            </p>
          ) : (
            filteredDomainSlugs.map((slug: Slug) => {
              const checked = selectedSlugIds.includes(slug.id);
              return (
                <label key={slug.id} className='flex items-center gap-2 text-xs text-gray-200'>
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(): void => handleToggleSlug(slug)}
                  />
                  /{slug.slug}
                </label>
              );
            })
          )}
        </div>
        <p className='text-[10px] text-gray-500'>{selectedSlugIds.length} selected</p>
      </div>

      {crossZoneSlugs.length > 0 ? (
        <div className='rounded border border-amber-500/40 bg-amber-500/10 p-3'>
          <p className='text-[10px] font-semibold uppercase tracking-wide text-amber-200'>
            Cross-zone slugs
          </p>
          <p className='mt-1 text-[10px] text-amber-200/80'>
            These slugs are not part of the current zone. Remove them or switch zones.
          </p>
          <div className='mt-2 flex flex-wrap gap-1.5'>
            {crossZoneSlugs.map((slug: Slug) => (
              <Badge
                key={slug.id}
                variant='outline'
                className='h-auto border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200 cursor-pointer hover:bg-amber-500/30'
                onClick={(): void => handleRemoveSlug(slug)}
              >
                /{slug.slug} ×
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Home page</Label>
        {eligibleHomeSlugs.length === 0 ? (
          <p className='text-xs text-gray-500'>
            Assign at least one slug in this zone to set this page as the home page.
          </p>
        ) : (
          <div className='space-y-2'>
            {eligibleHomeSlugs.map((slug: Slug) => {
              const isHome = currentHomeSlug?.id === slug.id;
              return (
                <div
                  key={slug.id}
                  className='flex items-center justify-between rounded border border-border/40 bg-gray-900/40 px-2.5 py-2 text-xs'
                >
                  <span className='text-gray-200'>/{slug.slug}</span>
                  {isHome ? (
                    <Badge
                      variant='success'
                      className='h-auto border-green-500/40 bg-green-500/10 px-2 py-0.5 text-[10px] text-green-300'
                    >
                      Home
                    </Badge>
                  ) : (
                    <Button
                      size='sm'
                      variant='outline'
                      disabled={updateSlug.isPending}
                      onClick={(): void => {
                        void handleSetHome(slug);
                      }}
                      className='h-6 px-2 text-[10px]'
                    >
                      Set as home
                    </Button>
                  )}
                </div>
              );
            })}
            {currentHomeSlug && !pageHomeSlug ? (
              <p className='text-[10px] text-gray-500'>
                Current home page: /{currentHomeSlug.slug}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <p className='text-xs text-gray-500'>
        Select a section or block from the tree to edit its settings.
      </p>

      <div className='space-y-2 border-t border-border/40 pt-4'>
        <Label className='text-xs text-gray-400'>Preview options</Label>
        <label className='flex items-center justify-between rounded border border-border/40 bg-gray-900/40 px-3 py-2 text-xs text-gray-200'>
          <span>Draft Preview</span>
          <Checkbox checked={previewDraftsEnabled} onCheckedChange={handleDraftPreviewChange} />
        </label>
        <label className='flex items-center justify-between rounded border border-border/40 bg-gray-900/40 px-3 py-2 text-xs text-gray-200'>
          <span>Pause slides on hover</span>
          <Checkbox
            checked={pauseSlideshowOnHoverInEditor}
            onCheckedChange={handlePauseSlidesOnHoverChange}
          />
        </label>
      </div>
    </div>
  );
}
