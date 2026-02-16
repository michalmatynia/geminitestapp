'use client';

import { Edit, Link2, Unlink } from 'lucide-react';
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
import type { CmsDomain, Slug } from '@/features/cms/types';
import { CMS_DOMAIN_SETTINGS_KEY, normalizeCmsDomainSettings } from '@/features/cms/types/domain-settings';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Button,
  ListPanel,
  Label,
  Switch,
  EmptyState,
  PageLayout,
  SelectSimple,
  DataTable,
  StatusBadge,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
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
  const [slugToDelete, setSlugToDelete] = useState<Slug | null>(null);
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
            {row.original.isDefault && <StatusBadge status='Default' variant='info' size='sm' className='font-bold' />}
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

      <AttachSlugModal
        isOpen={attachOpen}
        onClose={() => setAttachOpen(false)}
        onSuccess={() => setAttachOpen(false)}
        items={allSlugs}
        loading={allSlugsQuery.isLoading}
        alreadyAssignedIds={new Set(slugs.map(s => s.id))}
        onAttach={async (selectedIds) => {
          const selected = allSlugs.filter((item: Slug) => selectedIds.includes(item.id));
          for (const slug of selected) {
            await createSlug.mutateAsync({ slug: slug.slug, domainId: activeDomainId });
          }
          setAttachOpen(false);
        }}
      />

      <ConfirmModal
        open={!!slugToDelete}
        onClose={() => setSlugToDelete(null)}
        onConfirm={handleConfirmDelete}
        title='Remove Slug from Zone'
        message='This route will be detached from the current domain. It will remain active in other domains if previously assigned.'
        confirmText='Detach Route'
        isDangerous={true}
      />
    </PageLayout>
  );
}
