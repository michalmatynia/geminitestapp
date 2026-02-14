'use client';

import { Edit, Link2, Unlink } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useCallback } from 'react';

import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import {
  useCmsAllSlugs,
  useCmsSlugs,
  useCreateSlug,
  useDeleteSlug,
} from '@/features/cms/hooks/useCmsQueries';
import type { CmsDomain, Slug } from '@/features/cms/types';
import { CMS_DOMAIN_SETTINGS_KEY, normalizeCmsDomainSettings } from '@/features/cms/types/domain-settings';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Button,
  ListPanel,
  Label,
  Checkbox,
  Switch,
  ConfirmDialog,
  EmptyState,
  SearchInput,
  AppModal,
  PageLayout,
  SelectSimple,
  DataTable,
  Badge,
  FormField
} from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
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
    () =>
      normalizeCmsDomainSettings(
        parseJsonSetting(domainSettingsRaw, null)
      ),
    [domainSettingsRaw]
  );
  const zoningToggleValue = domainSettings.zoningEnabled;
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachSelectedIds, setAttachSelectedIds] = useState<string[]>([]);
  const [slugToDelete, setSlugToDelete] = useState<Slug | null>(null);
  const [attachSearch, setAttachSearch] = useState('');
  const [attachError, setAttachError] = useState('');
  const slugsQuery = useCmsSlugs(activeDomainId);
  const allSlugsQuery = useCmsAllSlugs(attachOpen);
  const createSlug = useCreateSlug();
  const deleteSlug = useDeleteSlug();
  const slugs = useMemo((): Slug[] => slugsQuery.data ?? [], [slugsQuery.data]);
  const allSlugs = useMemo((): Slug[] => allSlugsQuery.data ?? [], [allSlugsQuery.data]);

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

  const availableAttachSlugs = useMemo((): Slug[] => {
    const assigned = new Set(slugs.map((slug: Slug) => slug.id));
    const base = allSlugs.filter((slug: Slug) => !assigned.has(slug.id));
    const term = attachSearch.trim().toLowerCase();
    if (!term) return base;
    return base.filter((slug: Slug) => slug.slug.toLowerCase().includes(term));
  }, [allSlugs, slugs, attachSearch]);

  const selectedAttachCount = useMemo((): number => attachSelectedIds.length, [attachSelectedIds]);

  const toggleAttachSelection = (slugId: string): void => {
    setAttachSelectedIds((prev: string[]): string[] =>
      prev.includes(slugId) ? prev.filter((id: string): boolean => id !== slugId) : [...prev, slugId]
    );
  };

  const selectAllVisible = (): void => {
    const visibleIds = availableAttachSlugs.map((slug: Slug) => slug.id);
    setAttachSelectedIds((prev: string[]): string[] => Array.from(new Set([...prev, ...visibleIds])));
  };

  const clearSelection = (): void => {
    setAttachSelectedIds([]);
  };

  const handleAttach = async (): Promise<void> => {
    if (!attachSelectedIds.length) {
      setAttachError('Select at least one slug to attach.');
      return;
    }
    const selected = allSlugs.filter((item: Slug) => attachSelectedIds.includes(item.id));
    if (!selected.length) {
      setAttachError('Selected slugs are no longer available.');
      return;
    }
    setAttachError('');
    for (const slug of selected) {
      await createSlug.mutateAsync({ slug: slug.slug, domainId: activeDomainId });
    }
    setAttachSelectedIds([]);
    setAttachSearch('');
    setAttachOpen(false);
  };

  const handleDelete = useCallback((slug: Slug): void => {
    setSlugToDelete(slug);
  }, []);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!slugToDelete) return;
    try {
      await deleteSlug.mutateAsync({ id: slugToDelete.id, domainId: activeDomainId });
    } catch (error) {
      logClientError(error, { context: { source: 'slugs-page', action: 'deleteSlug', slugId: slugToDelete.id } });
    } finally {
      setSlugToDelete(null);
    }
  };

  const columns = useMemo<ColumnDef<Slug>[]>(() => [
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
            {row.original.isDefault && <Badge variant='outline' className='text-[9px] uppercase font-bold bg-blue-500/10 text-blue-400 border-blue-500/20 px-1 py-0 h-4'>Default</Badge>}
            {(canonicalDomain || sharedWithDomains.length > 0) && (
              <Badge variant='outline' className='text-[9px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-1 py-0 h-4'>Shared</Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'sharing',
      header: 'Sharing Status',
      cell: ({ row: _row }) => {
        if (canonicalDomain) return <span className='text-xs text-gray-500'>Inherited from {canonicalDomain.domain}</span>;
        if (sharedWithDomains.length > 0) return <span className='text-xs text-gray-500'>Pushed to {sharedWithDomains.length} domains</span>;
        return <span className='text-xs text-gray-600 italic'>Local only</span>;
      }
    },
    {
      id: 'actions',
      header: () => <div className='text-right'>Actions</div>,
      cell: ({ row }) => (
        <div className='flex justify-end gap-2'>
          <Link href={buildDomainHref(`/admin/cms/slugs/${row.original.id}/edit`)}>
            <Button variant='ghost' size='xs' className='h-7 w-7 p-0'>
              <Edit className='size-3.5' />
            </Button>
          </Link>
          <Button 
            variant='ghost' 
            size='xs' 
            className='h-7 w-7 p-0 text-rose-400 hover:text-rose-300'
            onClick={() => handleDelete(row.original)}
          >
            <Unlink className='size-3.5' />
          </Button>
        </div>
      )
    }
  ], [buildDomainHref, canonicalDomain, sharedWithDomains, handleDelete]);

  return (
    <PageLayout
      title='Slugs'
      description={
        zoningEnabled
          ? 'Manage unique paths assigned to the active domain. These control how pages are resolved.'
          : 'Global route management. Domain zoning is currently disabled.'
      }
      headerActions={
        <div className='flex items-center gap-3'>
          <div className='flex items-center gap-2 rounded-lg border border-border/60 bg-black/20 px-3 py-1.5'>
            <Switch
              id='cms-domain-zoning'
              checked={zoningToggleValue}
              onCheckedChange={handleZoningToggle}
              disabled={updateSetting.isPending}
            />
            <Label htmlFor='cms-domain-zoning' className='text-[10px] uppercase font-bold text-gray-500 cursor-pointer'>
              Zoning
            </Label>
          </div>
          {zoningEnabled ? (
            <SelectSimple
              value={activeDomainId || ''}
              onValueChange={handleDomainChange}
              options={domains.map((item: CmsDomain) => ({
                value: item.id,
                label: item.domain,
                description: hostDomainId === item.id ? 'host' : undefined
              }))}
              placeholder='Select domain...'
              className='w-[200px]'
              size='sm'
            />
          ) : null}
          <div className='flex gap-2'>
            {zoningEnabled && (
              <Button variant='outline' size='xs' className='h-8' onClick={() => setAttachOpen(true)}>
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
      <ListPanel variant='flat'>
        {slugs.length === 0 ? (
          <EmptyState
            title='No routes defined'
            description='This domain currently has no assigned slugs. Pages will not be reachable until a route is mapped.'
            action={
              <div className='flex gap-2'>
                <Button onClick={() => setAttachOpen(true)} variant='outline' size='sm'>
                  Attach Existing
                </Button>
                <Button asChild size='sm'>
                  <Link href={buildDomainHref('/admin/cms/slugs/create')}>
                    Create First Slug
                  </Link>
                </Button>
              </div>
            }
          />
        ) : (
          <div className='rounded-md border border-border bg-gray-950/20 overflow-hidden'>
            <DataTable
              columns={columns}
              data={slugs}
              isLoading={slugsQuery.isLoading}
            />
          </div>
        )}
      </ListPanel>

      <AppModal
        open={attachOpen}
        onClose={(): void => {
          setAttachOpen(false);
          setAttachSelectedIds([]);
          setAttachSearch('');
          setAttachError('');
        }}
        title='Attach Existing Slug'
        size='md'
        footer={
          <div className='flex justify-end gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                setAttachOpen(false);
                setAttachSelectedIds([]);
                setAttachSearch('');
                setAttachError('');
              }}
            >
              Cancel
            </Button>
            <Button
              size='sm'
              onClick={() => { void handleAttach(); }}
              disabled={selectedAttachCount === 0}
            >
              Attach {selectedAttachCount > 0 ? `(${selectedAttachCount})` : ''}
            </Button>
          </div>
        }
      >
        <div className='space-y-4'>
          <FormField label='Search Available Routes'>
            <SearchInput
              value={attachSearch}
              onChange={(e) => setAttachSearch(e.target.value)}
              onClear={() => setAttachSearch('')}
              placeholder='Filter slugs...'
              className='h-9'
            />
          </FormField>
          
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='text-[10px] uppercase font-bold text-gray-500'>Available Slugs</span>
              <div className='flex items-center gap-3 text-[10px] uppercase font-bold'>
                <button type='button' className='text-blue-400 hover:text-blue-300' onClick={selectAllVisible}>All</button>
                <button type='button' className='text-gray-500 hover:text-gray-400' onClick={clearSelection}>None</button>
              </div>
            </div>
            
            <div className='max-h-60 overflow-y-auto rounded border border-border/60 bg-black/20 p-2 divide-y divide-white/5'>
              {allSlugsQuery.isLoading ? (
                <div className='py-8 text-center text-xs text-gray-500 animate-pulse'>Fetching global slug index...</div>
              ) : availableAttachSlugs.length === 0 ? (
                <div className='py-8 text-center text-xs text-gray-600 italic'>No unassigned routes found matching your criteria.</div>
              ) : (
                availableAttachSlugs.map((slug) => (
                  <label key={slug.id} className='flex items-center gap-3 p-2 hover:bg-white/5 cursor-pointer transition-colors'>
                    <Checkbox
                      checked={attachSelectedIds.includes(slug.id)}
                      onCheckedChange={() => toggleAttachSelection(slug.id)}
                    />
                    <span className='text-sm text-gray-300'>/{slug.slug}</span>
                  </label>
                ))
              )}
            </div>
            
            {attachError && <p className='text-xs text-rose-400 font-medium'>{attachError}</p>}
          </div>
        </div>
      </AppModal>

      <ConfirmDialog
        open={!!slugToDelete}
        onOpenChange={(open) => !open && setSlugToDelete(null)}
        onConfirm={(): void => { void handleConfirmDelete(); }}
        title='Remove Slug from Zone'
        description='This route will be detached from the current domain. It will remain active in other domains if previously assigned.'
        confirmText='Detach Route'
        variant='destructive'
      />
    </PageLayout>
  );
}
