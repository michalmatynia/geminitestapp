'use client';

import { Eye, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { CmsDomainSelector } from '@/features/cms/components/CmsDomainSelector';
import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import { useCmsPages, useCmsSlugs, useDeletePage } from '@/features/cms/hooks/useCmsQueries';
import {
  normalizePageSlugLinks,
  type NormalizedPageSlugLink,
} from '@/features/cms/utils/slug-utils';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { PageStatus, PageSummary, Slug } from '@/shared/contracts/cms';
import { useAdminLayoutActions } from '@/shared/providers/AdminLayoutProvider';
import { AdminCmsPageLayout } from '@/shared/ui/admin.public';
import { Button, Badge, DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/primitives.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { SelectSimple, ActionMenu } from '@/shared/ui/forms-and-actions.public';
import { StandardDataTablePanel, FilterPanel } from '@/shared/ui/templates.public';
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';
import type { FilterField } from '@/shared/contracts/ui/ui/panels';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { ColumnDef } from '@tanstack/react-table';


type StatusFilter = PageStatus | 'all';
type StatusFilterOption = LabeledOptionDto<StatusFilter>;

const STATUS_FILTERS: StatusFilterOption[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Scheduled', value: 'scheduled' },
];

const buildZoneSlugOptions = (zoneSlugs: string[]): Array<LabeledOptionDto<string>> =>
  zoneSlugs.map((slug) => ({ value: slug, label: `/${slug}` }));

export default function PagesPage(): React.ReactNode {
  const { setIsMenuCollapsed, setIsProgrammaticallyCollapsed } = useAdminLayoutActions();
  const router = useRouter();
  const { activeDomainId, activeDomain } = useCmsDomainSelection();
  const pagesQuery = useCmsPages(activeDomainId);
  const slugsQuery = useCmsSlugs(activeDomainId);
  const deletePage = useDeletePage();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [previewSelections, setPreviewSelections] = useState<Record<string, string>>({});
  const [pageToDelete, setPageToDelete] = useState<PageSummary | null>(null);

  const pages = useMemo((): PageSummary[] => pagesQuery.data ?? [], [pagesQuery.data]);
  const domainSlugs = useMemo((): Slug[] => slugsQuery.data ?? [], [slugsQuery.data]);
  const domainSlugSet = useMemo((): Set<string> | null => {
    if (!domainSlugs.length) return null;
    const values = domainSlugs
      .map((slug: Slug): string => (typeof slug.slug === 'string' ? slug.slug.trim() : ''))
      .filter((slugValue: string): boolean => slugValue.length > 0);
    return values.length ? new Set(values) : null;
  }, [domainSlugs]);

  const filteredPages = useMemo((): PageSummary[] => {
    let result = pages;
    if (statusFilter !== 'all') {
      result = result.filter((page: PageSummary) => (page.status ?? 'draft') === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((page: PageSummary) => page.name.toLowerCase().includes(q));
    }
    return result;
  }, [pages, statusFilter, search]);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!pageToDelete) return;
    try {
      await deletePage.mutateAsync(pageToDelete.id);
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'PagesPage.handleConfirmDelete',
        pageId: pageToDelete.id,
      });
    } finally {
      setPageToDelete(null);
    }
  };

  const handleCreatePage = (): void => {
    setIsMenuCollapsed(true);
    setIsProgrammaticallyCollapsed(true);
    router.push('/admin/cms/pages/create');
  };

  const handlePreview = (slug: string): void => {
    if (typeof window === 'undefined') return;
    const protocol = window.location.protocol;
    const currentHost = window.location.host;
    const currentHostname = window.location.hostname;
    const targetHost = activeDomain?.domain ?? currentHostname;
    const resolvedHost = targetHost === currentHostname ? currentHost : targetHost;
    const path = slug.startsWith('/') ? slug : `/${slug}`;
    window.open(`${protocol}//${resolvedHost}${path}`, '_blank', 'noopener,noreferrer');
  };

  const columns = useMemo<ColumnDef<PageSummary>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Page Name',
        cell: ({ row }) => (
          <div className='flex flex-col gap-1'>
            <Link
              href={`/admin/cms/builder?pageId=${row.original.id}`}
              className='font-medium text-gray-200 hover:text-blue-300 transition-colors'
            >
              {row.original.name}
            </Link>
            <div className='flex flex-wrap gap-1'>
              {normalizePageSlugLinks(row.original.slugs).map((s: NormalizedPageSlugLink) => {
                const isOutOfZone = domainSlugSet && !domainSlugSet.has(s.slug);
                return (
                  <Badge
                    key={s.id}
                    variant='outline'
                    className={`text-[9px] px-1 py-0 ${isOutOfZone ? 'border-amber-500/30 text-amber-400 bg-amber-500/5' : 'text-gray-500'}`}
                  >
                    /{s.slug}
                  </Badge>
                );
              })}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge status={row.original.status ?? 'draft'} className='text-[10px]' />
        ),
        size: 100,
      },
      {
        id: 'preview',
        header: 'Live Preview',
        cell: ({ row }) => {
          const page = row.original;
          const slugValues = normalizePageSlugLinks(page.slugs).map(
            (slugLink: NormalizedPageSlugLink): string => slugLink.slug
          );
          const zoneSlugs = domainSlugSet
            ? slugValues.filter((value: string) => domainSlugSet.has(value))
            : [];
          const selectedSlugCandidate = previewSelections[page.id];
          const previewSlug = zoneSlugs.length
            ? selectedSlugCandidate && zoneSlugs.includes(selectedSlugCandidate)
              ? selectedSlugCandidate
              : zoneSlugs[0]
            : null;

          if (!previewSlug)
            return <span className='text-[10px] text-gray-600 uppercase font-bold'>No route</span>;

          return (
            <div className='flex items-center gap-2'>
              {zoneSlugs.length > 1 ? (
                <SelectSimple
                  size='xs'
                  value={previewSlug}
                  onValueChange={(val) =>
                    setPreviewSelections((prev) => ({ ...prev, [page.id]: val }))
                  }
                  options={buildZoneSlugOptions(zoneSlugs)}
                  className='h-7 w-28 text-[10px]'
                 ariaLabel='Select option' title='Select option'/>
              ) : (
                <span className='text-[10px] text-blue-400 font-mono'>/{previewSlug}</span>
              )}
              <Button
                variant='ghost'
                size='xs'
                className='h-7 w-7 p-0'
                onClick={() => handlePreview(previewSlug)}
                title={`Preview on ${activeDomain?.domain ?? 'current'}`}
                aria-label={`Preview on ${activeDomain?.domain ?? 'current'}`}>
                <Eye className='size-3.5' />
              </Button>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({ row }) => (
          <div className='flex justify-end'>
            <ActionMenu ariaLabel={`Actions for page ${row.original.name}`}>
              <DropdownMenuItem
                onSelect={(event: Event): void => {
                  event.preventDefault();
                  router.push(`/admin/cms/builder?pageId=${row.original.id}`);
                }}
              >
                Open in Builder
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event: Event): void => {
                  event.preventDefault();
                  router.push(`/admin/cms/pages/${row.original.id}/edit`);
                }}
              >
                Edit Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                onSelect={(event: Event): void => {
                  event.preventDefault();
                  setPageToDelete(row.original);
                }}
              >
                Delete
              </DropdownMenuItem>
            </ActionMenu>
          </div>
        ),
      },
    ],
    [domainSlugSet, previewSelections, activeDomain]
  );

  const filterConfig: FilterField[] = useMemo(
    () => [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: STATUS_FILTERS,
      },
    ],
    []
  );

  const filters = (
    <FilterPanel
      filters={filterConfig}
      values={{ status: statusFilter }}
      search={search}
      searchPlaceholder='Search pages by name...'
      onFilterChange={(key, value) => {
        if (key === 'status') setStatusFilter(value as StatusFilter);
      }}
      onSearchChange={setSearch}
      onReset={() => {
        setStatusFilter('all');
        setSearch('');
      }}
      showHeader={false}
      compact
    />
  );

  return (
    <AdminCmsPageLayout
      title='Content Pages'
      current='Pages'
      description='Manage layouts and routes for your marketplace domains.'
      headerActions={
        <div className='flex gap-2'>
          <CmsDomainSelector />
          <Button size='xs' className='h-8' onClick={handleCreatePage}>
            <Plus className='size-3.5 mr-2' />
            Create Page
          </Button>
        </div>
      }
    >
      <StandardDataTablePanel
        filters={filters}
        variant='flat'
        columns={columns}
        data={filteredPages}
        isLoading={pagesQuery.isLoading}
      />

      <ConfirmModal
        isOpen={!!pageToDelete}
        onClose={() => setPageToDelete(null)}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
        title='Permanently Delete Page?'
        message={`This will destroy "${pageToDelete?.name}" and all its block configurations. This cannot be undone.`}
        confirmText='Destroy Page'
        isDangerous
      />
    </AdminCmsPageLayout>
  );
}
