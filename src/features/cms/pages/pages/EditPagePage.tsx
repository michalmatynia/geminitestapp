'use client';

import { useRouter, useParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { CmsDomainSelector } from '@/features/cms/components/CmsDomainSelector';
import CmsEditorLayout from '@/features/cms/components/CmsEditorLayout';
import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import {
  useCmsAllSlugs,
  useCmsPage,
  useCmsSlugs,
  useUpdatePage,
} from '@/features/cms/hooks/useCmsQueries';
import { normalizePageSlugValues } from '@/features/cms/utils/slug-utils';
import { cmsPageUpdateSchema } from '@/features/cms/validations/api';
import type { Page, Slug } from '@/shared/contracts/cms';
import { AdminCmsBreadcrumbs } from '@/shared/ui/admin.public';
import { Alert, Button } from '@/shared/ui/primitives.public';
import { FormActions, FormSection, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { LoadingState, SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { StatusBadge, SearchableList } from '@/shared/ui/data-display.public';
import { validateFormData } from '@/shared/validations/form-validation';

export default function EditPagePageLoader(): React.JSX.Element {
  const router = useRouter();
  const { id } = useParams();
  const pageId = Array.isArray(id) ? id[0] : id;
  const pageQuery = useCmsPage(pageId);

  if (!pageId) {
    return (
      <CmsEditorLayout>
        <div className='mx-auto flex w-full max-w-3xl flex-col gap-4 py-10'>
          <Alert variant='error'>Invalid page URL. Missing page id.</Alert>
          <div>
            <Button variant='secondary' onClick={() => router.push('/admin/cms/pages')}>
              Back to Pages
            </Button>
          </div>
        </div>
      </CmsEditorLayout>
    );
  }

  if (pageQuery.isLoading) {
    return <LoadingState message='Loading page content...' />;
  }

  if (pageQuery.isError || !pageQuery.data) {
    const message = pageQuery.error instanceof Error ? pageQuery.error.message : 'Page not found.';
    return (
      <CmsEditorLayout>
        <div className='mx-auto flex w-full max-w-3xl flex-col gap-4 py-10'>
          <Alert variant='error'>{message}</Alert>
          <div className='flex gap-2'>
            <Button variant='secondary' onClick={() => router.push('/admin/cms/pages')}>
              Back to Pages
            </Button>
            <Button
              variant='outline'
              onClick={() => {
                void pageQuery.refetch();
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      </CmsEditorLayout>
    );
  }

  return <EditPageContent key={pageQuery.data.id} initialPage={pageQuery.data} pageId={pageId} />;
}

type EditPageRouteListProps = {
  visibleSlugs: Slug[];
  selectedSlugIds: string[];
  domainSlugIds: Set<string>;
  onToggleSlug: (slugId: string) => void;
};

export function EditPageRouteList(props: EditPageRouteListProps): React.JSX.Element {
  const { visibleSlugs, selectedSlugIds, domainSlugIds, onToggleSlug } = props;

  return (
    <SearchableList
      items={visibleSlugs}
      selectedIds={selectedSlugIds}
      onToggle={onToggleSlug}
      getId={(slug: Slug) => slug.id}
      getLabel={(slug: Slug) => slug.slug}
      searchPlaceholder='Filter routes...'
      renderItem={(slug: Slug) => (
        <div className='flex flex-1 items-center justify-between'>
          <span className='text-sm text-gray-300'>/{slug.slug}</span>
          {!domainSlugIds.has(slug.id) && (
            <StatusBadge status='Cross-Zone' variant='warning' size='sm' className='font-bold' />
          )}
        </div>
      )}
    />
  );
}

function EditPageContent({
  initialPage,
  pageId,
}: {
  initialPage: Page;
  pageId: string;
}): React.JSX.Element {
  const page = initialPage;
  const { activeDomainId } = useCmsDomainSelection();
  const slugsQuery = useCmsSlugs(activeDomainId);
  const allSlugsQuery = useCmsAllSlugs(true);
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

  const initialSelectedSlugIds = useMemo((): string[] => {
    if (!allSlugs.length) return [];
    const pageSlugValues = normalizePageSlugValues(initialPage.slugs);
    return pageSlugValues
      .map((value: string) => allSlugByValue.get(value)?.id)
      .filter((value: string | undefined): value is string => Boolean(value));
  }, [allSlugs.length, allSlugByValue, initialPage.slugs]);

  const selectedSlugIds = manualSelectedSlugIds ?? initialSelectedSlugIds;

  const domainSlugIds = useMemo(
    (): Set<string> => new Set(domainSlugs.map((slug: Slug) => slug.id)),
    [domainSlugs]
  );
  const selectedSlugs = useMemo((): Slug[] => {
    const byId = new Map(allSlugs.map((slug: Slug) => [slug.id, slug]));
    const isSlug = (value: Slug | undefined): value is Slug => Boolean(value);
    return selectedSlugIds.map((idValue: string) => byId.get(idValue)).filter(isSlug);
  }, [allSlugs, selectedSlugIds]);

  const crossZoneSlugs = useMemo(
    (): Slug[] => selectedSlugs.filter((slug: Slug) => !domainSlugIds.has(slug.id)),
    [selectedSlugs, domainSlugIds]
  );

  const visibleSlugs = includeAllZones ? allSlugs : domainSlugs;
  const handleToggleSlug = useCallback(
    (slugId: string): void => {
      setManualSelectedSlugIds((previousSlugIds) => {
        const currentSlugIds = previousSlugIds ?? selectedSlugIds;
        return currentSlugIds.includes(slugId)
          ? currentSlugIds.filter((value: string) => value !== slugId)
          : [...currentSlugIds, slugId];
      });
    },
    [selectedSlugIds]
  );

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
      'Page form is invalid.'
    );
    if (!validation.success) {
      setError(validation.firstError);
      return;
    }

    setError(null);
    await updatePage.mutateAsync({
      id: pageId,
      input: validation.data,
    });
    router.push('/admin/cms/pages');
  };

  return (
    <CmsEditorLayout>
      <div className='mx-auto flex w-full max-w-3xl flex-col gap-6 py-10'>
        <SectionHeader
          title={page.name}
          description='Map content to URL routes and manage cross-zone availability.'
          eyebrow={
            <AdminCmsBreadcrumbs
              parent={{ label: 'Pages', href: '/admin/cms/pages' }}
              current='Edit'
              className='mb-2'
            />
          }
          actions={
            <FormActions
              onCancel={(): void => {
                router.push('/admin/cms/pages');
              }}
              cancelText='Back'
              onSave={(): void => {
                void handleSave();
              }}
              saveText='Save Changes'
              isSaving={updatePage.isPending}
            />
          }
        />

        {error && (
          <Alert variant='error' className='mb-6'>
            {error}
          </Alert>
        )}

        <div className='space-y-6'>
          <FormSection title='Context Selector' className='p-6'>
            <CmsDomainSelector />
          </FormSection>

          <FormSection
            title='Route Configuration'
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
            <EditPageRouteList
              visibleSlugs={visibleSlugs}
              selectedSlugIds={selectedSlugIds}
              domainSlugIds={domainSlugIds}
              onToggleSlug={handleToggleSlug}
            />
          </FormSection>

          {crossZoneSlugs.length > 0 && (
            <FormSection
              title='External Assignments'
              description='Routes from other zones currently pointing to this page.'
              className='p-6'
            >
              <div className='flex flex-wrap gap-2'>
                {crossZoneSlugs.map((slug) => (
                  <Button
                    key={slug.id}
                    variant='ghost'
                    size='sm'
                    onClick={() =>
                      setManualSelectedSlugIds((prev) => {
                        const current = prev ?? selectedSlugIds;
                        return current.filter((id) => id !== slug.id);
                      })
                    }
                    className='h-auto p-0 hover:bg-transparent'
                    aria-label={`Remove external assignment /${slug.slug}`}
                    title='Remove external assignment'
                  >
                    <StatusBadge
                      status={'/' + slug.slug + ' ×'}
                      variant='warning'
                      className='cursor-pointer hover:opacity-80 transition-opacity font-mono'
                    />
                  </Button>
                ))}
              </div>
            </FormSection>
          )}
        </div>
      </div>
    </CmsEditorLayout>
  );
}
