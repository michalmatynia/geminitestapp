'use client';
import { Eye, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import { CmsDomainSelector } from '@/features/cms/components/CmsDomainSelector';
import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import { useCmsPages, useCmsSlugs, useDeletePage } from '@/features/cms/hooks/useCmsQueries';
import type { PageStatus, PageSummary, Slug } from '@/shared/contracts/cms';
import {
  Button,
  StatusBadge,
  SelectSimple,
  Badge,
  SectionHeader,
  ActionMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Breadcrumbs,
  StandardDataTablePanel,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type { ColumnDef } from '@tanstack/react-table';

type StatusFilter = PageStatus | 'all';
type StatusFilterOption = { label: string; value: StatusFilter };
type NormalizedPageSlugLink = { id: string; slug: string };

const normalizePageSlugLinks = (rawSlugs: unknown): NormalizedPageSlugLink[] => {
  if (!Array.isArray(rawSlugs)) return [];

  const normalized = rawSlugs
    .map((entry: unknown, index: number): NormalizedPageSlugLink | null => {
      if (typeof entry === 'string') {
        const slugValue = entry.trim();
        if (!slugValue) return null;
        return {
          id: `legacy-string-${index}-${slugValue}`,
          slug: slugValue,
        };
      }
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;

      const record = entry as Record<string, unknown>;
      const nestedSlug = record['slug'];
      if (nestedSlug && typeof nestedSlug === 'object' && !Array.isArray(nestedSlug)) {
        const nestedRecord = nestedSlug as Record<string, unknown>;
        const slugValue =
          typeof nestedRecord['slug'] === 'string' ? nestedRecord['slug'].trim() : '';
        if (!slugValue) return null;
        const idValue =
          typeof nestedRecord['id'] === 'string' && nestedRecord['id'].trim()
            ? nestedRecord['id'].trim()
            : `legacy-nested-${index}-${slugValue}`;
        return {
          id: idValue,
          slug: slugValue,
        };
      }

      const slugValue = typeof record['slug'] === 'string' ? record['slug'].trim() : '';
      if (!slugValue) return null;
      const idValue =
        typeof record['id'] === 'string' && record['id'].trim()
          ? record['id'].trim()
          : `legacy-flat-${index}-${slugValue}`;
      return {
        id: idValue,
        slug: slugValue,
      };
    })
    .filter((entry): entry is NormalizedPageSlugLink => Boolean(entry));

  const seen = new Set<string>();
  return normalized.filter((entry) => {
    const key = `${entry.id}:${entry.slug}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const STATUS_FILTERS: StatusFilterOption[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Scheduled', value: 'scheduled' },
];

export default function PagesPage(): React.ReactNode {
  const { setIsMenuCollapsed, setIsProgrammaticallyCollapsed } = useAdminLayout();
  const router = useRouter();
  const { activeDomainId, activeDomain } = useCmsDomainSelection();
  const pagesQuery = useCmsPages(activeDomainId);
  const slugsQuery = useCmsSlugs(activeDomainId);
  const deletePage = useDeletePage();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [previewSelections, setPreviewSelections] = useState<Record<string, string>>({});
  const [pageToDelete, setPageToDelete] = useState<PageSummary | null>(null);

  const pages = useMemo((): PageSummary[] => pagesQuery.data ?? [], [pagesQuery.data]);
  const domainSlugs = useMemo((): Slug[] => slugsQuery.data ?? [], [slugsQuery.data]);
  const domainSlugSet = useMemo(
    (): Set<string> | null => {
      if (!domainSlugs.length) return null;
      const values = domainSlugs
        .map((slug: Slug): string => (typeof slug.slug === 'string' ? slug.slug.trim() : ''))
        .filter((slugValue: string): boolean => slugValue.length > 0);
      return values.length ? new Set(values) : null;
    },
    [domainSlugs]
  );
  
  const filteredPages = useMemo((): PageSummary[] => {
    if (statusFilter === 'all') return pages;
    return pages.filter((page: PageSummary) => (page.status ?? 'draft') === statusFilter);
  }, [pages, statusFilter]);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!pageToDelete) return;
    try {
      await deletePage.mutateAsync(pageToDelete.id);
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'PagesPage.handleConfirmDelete', pageId: pageToDelete.id } });
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

  const columns = useMemo<ColumnDef<PageSummary>[]>(() => [
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
      cell: ({ row }) => <StatusBadge status={row.original.status ?? 'draft'} className='text-[10px]' />,
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
          ? (selectedSlugCandidate && zoneSlugs.includes(selectedSlugCandidate)
            ? selectedSlugCandidate
            : zoneSlugs[0])
          : null;

        if (!previewSlug) return <span className='text-[10px] text-gray-600 uppercase font-bold'>No route</span>;

        return (
          <div className='flex items-center gap-2'>
            {zoneSlugs.length > 1 ? (
              <SelectSimple
                size='xs'
                value={previewSlug}
                onValueChange={(val) => setPreviewSelections(prev => ({ ...prev, [page.id]: val }))}
                options={zoneSlugs.map(s => ({ value: s, label: `/${s}` }))}
                className='h-7 w-28 text-[10px]'
              />
            ) : (
              <span className='text-[10px] text-blue-400 font-mono'>/{previewSlug}</span>
            )}
            <Button
              variant='ghost'
              size='xs'
              className='h-7 w-7 p-0'
              onClick={() => handlePreview(previewSlug)}
              title={`Preview on ${activeDomain?.domain ?? 'current'}`}
            >
              <Eye className='size-3.5' />
            </Button>
          </div>
        );
      }
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
      )
    }
  ], [domainSlugSet, previewSelections, activeDomain]);

  const header = (
    <SectionHeader
      title='Content Pages'
      description='Manage layouts and routes for your marketplace domains.'
      eyebrow={
        <Breadcrumbs
          items={[
            { label: 'Admin', href: '/admin' },
            { label: 'CMS', href: '/admin/cms' },
            { label: 'Pages' }
          ]}
          className='mb-2'
        />
      }
      actions={
        <div className='flex gap-2'>
          <CmsDomainSelector />
          <Button size='xs' className='h-8' onClick={handleCreatePage}>
            <Plus className='size-3.5 mr-2' />
            Create Page
          </Button>
        </div>
      }
    />
  );

  const filters = (
    <div className='flex gap-2'>
      {STATUS_FILTERS.map((filter) => (
        <Button
          key={filter.value}
          size='xs'
          variant={statusFilter === filter.value ? 'default' : 'outline'}
          onClick={() => setStatusFilter(filter.value)}
          className='h-7 rounded-full px-3'
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );

  return (
    <div className='mx-auto w-full max-w-none py-10 space-y-6'>
      <StandardDataTablePanel
        header={header}
        filters={filters}
        variant='flat'
        columns={columns}
        data={filteredPages}
        isLoading={pagesQuery.isLoading}
      />

      <ConfirmModal
        isOpen={!!pageToDelete}
        onClose={() => setPageToDelete(null)}
        onConfirm={() => { void handleConfirmDelete(); }}
        title='Permanently Delete Page?'
        message={`This will destroy "${pageToDelete?.name}" and all its block configurations. This cannot be undone.`}
        confirmText='Destroy Page'
        isDangerous
      />
    </div>
  );
}
