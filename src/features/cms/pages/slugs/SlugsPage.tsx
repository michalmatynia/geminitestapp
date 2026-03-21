'use client';

import { Link2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useCallback } from 'react';

import { AttachSlugModal } from '@/features/cms/components/slugs/AttachSlugModal';
import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import {
  useCmsAllSlugs,
  useCmsSlugs,
  useCreateSlug,
  useDeleteSlug,
} from '@/features/cms/hooks/useCmsQueries';
import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import type { CmsDomain, Slug } from '@/shared/contracts/cms';
import { CMS_DOMAIN_SETTINGS_KEY, normalizeCmsDomainSettings } from '@/shared/contracts/cms';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  AdminCmsPageLayout,
  Button,
  StandardDataTablePanel,
  ToggleRow,
  EmptyState,
  SelectSimple,
  StatusBadge,
  ActionMenu,
  DropdownMenuItem,
  FilterPanel,
  UI_CENTER_ROW_SPACED_CLASSNAME,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

import type { ColumnDef } from '@tanstack/react-table';

export default function SlugsPage(): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const domainIdParam = searchParams.get('domainId') ?? undefined;
  const {
    domains,
    activeDomainId,
    hostDomainId,
    canonicalDomain,
    sharedWithDomains,
    setActiveDomainId,
    zoningEnabled,
  } = useCmsDomainSelection({ initialDomainId: domainIdParam ?? null });
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const domainSettingsRaw = settingsStore.get(CMS_DOMAIN_SETTINGS_KEY);
  const domainSettings = useMemo(
    () => normalizeCmsDomainSettings(parseJsonSetting(domainSettingsRaw, null)),
    [domainSettingsRaw]
  );
  const zoningToggleValue = domainSettings.zoningEnabled;
  const [attachOpen, setAttachOpen] = useState(false);
  const [slugToDelete, setSlugToDelete] = useState<Slug | null>(null);
  const [search, setSearch] = useState('');
  const slugsQuery = useCmsSlugs(activeDomainId);
  const allSlugsQuery = useCmsAllSlugs(attachOpen);
  const createSlug = useCreateSlug();
  const deleteSlug = useDeleteSlug();
  const slugs = useMemo((): Slug[] => slugsQuery.data ?? [], [slugsQuery.data]);
  const allSlugs = useMemo((): Slug[] => allSlugsQuery.data ?? [], [allSlugsQuery.data]);
  const domainSelectOptions = useMemo<Array<LabeledOptionWithDescriptionDto<string>>>(
    () =>
      domains.map((domain: CmsDomain) => ({
        value: domain.id,
        label: domain.domain,
        description: hostDomainId === domain.id ? 'host' : undefined,
      })),
    [domains, hostDomainId]
  );

  const filteredSlugs = useMemo((): Slug[] => {
    if (!search.trim()) return slugs;
    const q = search.toLowerCase().trim().replace(/^\//, '');
    return slugs.filter((s) => s.slug.toLowerCase().includes(q));
  }, [slugs, search]);

  const handleDomainChange = (value: string): void => {
    if (value === (activeDomainId ?? '')) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('domainId', value);
    } else {
      params.delete('domainId');
    }
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
    setActiveDomainId(value || null);
  };

  const handleZoningToggle = (checked: boolean): void => {
    const next = normalizeCmsDomainSettings({ ...domainSettings, zoningEnabled: checked });
    updateSetting.mutate({ key: CMS_DOMAIN_SETTINGS_KEY, value: serializeSetting(next) });
  };

  const buildDomainHref = useMemo((): ((href: string) => string) => {
    return (href: string): string =>
      activeDomainId ? `${href}?domainId=${encodeURIComponent(activeDomainId)}` : href;
  }, [activeDomainId]);

  const handleDelete = useCallback((slug: Slug): void => {
    setSlugToDelete(slug);
  }, []);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!slugToDelete) return;
    try {
      await deleteSlug.mutateAsync({ id: slugToDelete.id, domainId: activeDomainId });
    } catch (error) {
      logClientCatch(error, {
        source: 'slugs-page',
        action: 'deleteSlug',
        slugId: slugToDelete.id,
      });
    } finally {
      setSlugToDelete(null);
    }
  };

  const columns = useMemo<ColumnDef<Slug>[]>(
    () => [
      {
        accessorKey: 'slug',
        header: 'Route Path',
        cell: ({ row }) => (
          <div className='flex flex-col gap-1'>
            <Link
              href={buildDomainHref(`/admin/cms/slugs/${row.original.id}/edit`)}
              className='font-medium text-gray-200 hover:text-blue-300 transition-colors'
            >
              /{row.original.slug}
            </Link>
            <div className='flex items-center gap-2'>
              {row.original.isDefault && (
                <StatusBadge status='Default' variant='info' size='sm' className='font-bold' />
              )}
              {(canonicalDomain || sharedWithDomains.length > 0) && (
                <StatusBadge status='Shared' variant='active' size='sm' className='font-bold' />
              )}
            </div>
          </div>
        ),
      },
      {
        id: 'sharing',
        header: 'Sharing Status',
        cell: ({ row: _row }) => {
          if (canonicalDomain)
            return (
              <span className='text-xs text-gray-500'>Inherited from {canonicalDomain.domain}</span>
            );
          if (sharedWithDomains.length > 0)
            return (
              <span className='text-xs text-gray-500'>
                Pushed to {sharedWithDomains.length} domains
              </span>
            );
          return <span className='text-xs text-gray-600 italic'>Local only</span>;
        },
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({ row }) => (
          <div className='flex justify-end'>
            <ActionMenu ariaLabel={`Actions for slug /${row.original.slug}`}>
              <DropdownMenuItem
                onSelect={(event: Event): void => {
                  event.preventDefault();
                  router.push(buildDomainHref(`/admin/cms/slugs/${row.original.id}/edit`));
                }}
              >
                Edit Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                onSelect={(event: Event): void => {
                  event.preventDefault();
                  handleDelete(row.original);
                }}
              >
                Detach from Zone
              </DropdownMenuItem>
            </ActionMenu>
          </div>
        ),
      },
    ],
    [buildDomainHref, canonicalDomain, sharedWithDomains, handleDelete]
  );

  return (
    <AdminCmsPageLayout
      title='Slugs'
      current='Slugs'
      description={
        zoningEnabled
          ? 'Manage unique paths assigned to the active domain. These control how pages are resolved.'
          : 'Global route management. Domain zoning is currently disabled.'
      }
      headerActions={
        <div className={UI_CENTER_ROW_SPACED_CLASSNAME}>
          <ToggleRow
            label='Zoning'
            checked={zoningToggleValue}
            onCheckedChange={handleZoningToggle}
            disabled={updateSetting.isPending}
            className='bg-black/20 border-border/60 px-3 py-1.5'
            labelClassName='text-[10px] uppercase font-bold text-gray-500'
          />
          {zoningEnabled ? (
            <SelectSimple
              value={activeDomainId || ''}
              onValueChange={handleDomainChange}
              options={domainSelectOptions}
              placeholder='Select domain...'
              ariaLabel='Domain'
              className='w-[200px]'
              size='sm'
             title='Select domain...'/>
          ) : null}
          <div className='flex gap-2'>
            {zoningEnabled && (
              <Button
                variant='outline'
                size='xs'
                className='h-8'
                onClick={() => setAttachOpen(true)}
              >
                <Link2 className='size-3.5 mr-2' />
                Attach Existing
              </Button>
            )}
            <Button size='xs' className='h-8' asChild>
              <Link href={buildDomainHref('/admin/cms/slugs/create')}>Create New Slug</Link>
            </Button>
          </div>
        </div>
      }
    >
      <StandardDataTablePanel
        variant='flat'
        columns={columns}
        data={filteredSlugs}
        filters={
          <FilterPanel
            filters={[]}
            values={{}}
            search={search}
            searchPlaceholder='Search routes by path...'
            onFilterChange={() => {}}
            onSearchChange={setSearch}
            onReset={() => setSearch('')}
            showHeader={false}
            compact
          />
        }
        isLoading={slugsQuery.isLoading}
        emptyState={
          <EmptyState
            title='No routes defined'
            description='This domain currently has no assigned slugs. Pages will not be reachable until a route is mapped.'
            action={
              <div className='flex gap-2'>
                <Button onClick={() => setAttachOpen(true)} variant='outline' size='sm'>
                  Attach Existing
                </Button>
                <Button asChild size='sm'>
                  <Link href={buildDomainHref('/admin/cms/slugs/create')}>Create First Slug</Link>
                </Button>
              </div>
            }
          />
        }
      />

      <AttachSlugModal
        isOpen={attachOpen}
        onClose={() => setAttachOpen(false)}
        onSuccess={() => setAttachOpen(false)}
        items={allSlugs}
        loading={allSlugsQuery.isLoading}
        alreadyAssignedIds={new Set(slugs.map((s) => s.id))}
        onAttach={async (selectedIds) => {
          const selected = allSlugs.filter((item: Slug) => selectedIds.includes(item.id));
          for (const slug of selected) {
            await createSlug.mutateAsync({ slug: slug.slug, domainId: activeDomainId });
          }
          setAttachOpen(false);
        }}
      />

      <ConfirmModal
        isOpen={!!slugToDelete}
        onClose={() => setSlugToDelete(null)}
        onConfirm={handleConfirmDelete}
        title='Remove Slug from Zone'
        message='This route will be detached from the current domain. It will remain active in other domains if previously assigned.'
        confirmText='Detach Route'
        isDangerous={true}
      />
    </AdminCmsPageLayout>
  );
}
