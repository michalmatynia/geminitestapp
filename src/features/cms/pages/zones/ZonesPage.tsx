'use client';

import { PlusIcon, Trash2, Globe } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import {
  useCmsDomains,
  useCreateCmsDomain,
  useDeleteCmsDomain,
  useUpdateCmsDomain,
} from '@/features/cms/hooks/useCmsQueries';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { CmsDomain } from '@/shared/contracts/cms';
import {
  AdminCmsPageLayout,
  Button,
  Input,
  StandardDataTablePanel,
  useToast,
  SelectSimple,
  StatusBadge,
  FormField,
  FormSection,
  PanelFilters,
  UI_CENTER_ROW_SPACED_CLASSNAME,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { validateFormData } from '@/shared/validations/form-validation';

import { cmsDomainCreateSchema, cmsDomainUpdateSchema } from '../../validations/api';

import type { ColumnDef } from '@tanstack/react-table';

const ALIAS_PLACEHOLDER_OPTION: LabeledOptionDto<string> = {
  value: 'none',
  label: 'Keep Independent',
};

export default function ZonesPage(): React.JSX.Element {
  const domainsQuery = useCmsDomains();
  const createDomain = useCreateCmsDomain();
  const deleteDomain = useDeleteCmsDomain();
  const updateDomain = useUpdateCmsDomain();
  const { toast } = useToast();

  const domains = useMemo((): CmsDomain[] => domainsQuery.data ?? [], [domainsQuery.data]);
  const buildAliasOptions = React.useCallback(
    (currentId: string): Array<LabeledOptionDto<string>> => [
      ALIAS_PLACEHOLDER_OPTION,
      ...domains
        .filter((domain) => domain.id !== currentId)
        .map((domain) => ({
          value: domain.id,
          label: `Alias of ${domain.domain}`,
        })),
    ],
    [domains]
  );
  const [domain, setDomain] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [zoneToDelete, setZoneToDelete] = useState<string | null>(null);

  const filteredDomains = useMemo(() => {
    if (!search.trim()) return domains;
    const q = search.toLowerCase().trim();
    return domains.filter((d) => d.domain.toLowerCase().includes(q));
  }, [domains, search]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateFormData(
      cmsDomainCreateSchema,
      { domain },
      'Enter a domain or hostname.'
    );
    if (!validation.success) {
      setError(validation.firstError);
      return;
    }

    setError('');
    const handleAdd = async () => {
      try {
        await createDomain.mutateAsync(validation.data);
        setDomain('');
        toast(`Zone ${validation.data.domain} added successfully.`, { variant: 'success' });
      } catch (err: unknown) {
        logClientCatch(err, { source: 'ZonesPage', action: 'createDomain', domain });
        setError(err instanceof Error ? err.message : 'Failed to create domain.');
      }
    };
    void handleAdd();
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDomain.mutateAsync(id);
      toast('Zone removed successfully.', { variant: 'success' });
      setZoneToDelete(null);
    } catch (err: unknown) {
      logClientCatch(err, { source: 'ZonesPage', action: 'deleteDomain', domainId: id });
      toast(err instanceof Error ? err.message : 'Failed to delete domain.', { variant: 'error' });
    }
  };

  const handleAliasChange = async (id: string, aliasOfValue: string) => {
    const aliasOf = aliasOfValue === 'none' ? null : aliasOfValue;
    const validation = validateFormData(
      cmsDomainUpdateSchema,
      { aliasOf },
      'Alias selection is invalid.'
    );
    if (!validation.success) {
      setError(validation.firstError);
      return;
    }

    try {
      const input =
        validation.data.aliasOf === undefined ? {} : { aliasOf: validation.data.aliasOf };
      await updateDomain.mutateAsync({ id, input });
      toast('Zone routing updated.', { variant: 'success' });
    } catch (err: unknown) {
      logClientCatch(err, { source: 'ZonesPage', action: 'updateAlias', domainId: id, aliasOf });
      toast(err instanceof Error ? err.message : 'Failed to update alias.', { variant: 'error' });
    }
  };

  const columns = useMemo<ColumnDef<CmsDomain>[]>(
    () => [
      {
        accessorKey: 'domain',
        header: 'Hostname / URL',
        cell: ({ row }) => (
          <div className={UI_CENTER_ROW_SPACED_CLASSNAME}>
            <div className='flex h-8 w-8 items-center justify-center rounded bg-emerald-500/10 text-emerald-400'>
              <Globe className='size-4' />
            </div>
            <div className='flex flex-col'>
              <span className='font-medium text-gray-200'>{row.original.domain}</span>
              <span className='text-[10px] text-gray-500 font-mono uppercase tracking-tighter'>
                {row.original.id}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: 'type',
        header: 'Routing Policy',
        cell: ({ row }) => {
          if (!row.original.aliasOf)
            return (
              <StatusBadge
                status='Independent Zone'
                variant='info'
                size='sm'
                className='font-bold'
              />
            );
          const target = domains.find((d) => d.id === row.original.aliasOf);
          return (
            <div className='flex flex-col gap-1'>
              <StatusBadge
                status='Shared Context'
                variant='warning'
                size='sm'
                className='font-bold'
              />
              <span className='text-[10px] text-gray-500'>
                Inherits slugs from {target?.domain ?? 'another zone'}
              </span>
            </div>
          );
        },
      },
      {
        id: 'alias',
        header: 'Alias Configuration',
        cell: ({ row }) => (
            <SelectSimple
              size='xs'
              value={row.original.aliasOf ?? 'none'}
              onValueChange={(val) => {
                void handleAliasChange(row.original.id, val);
              }}
              options={buildAliasOptions(row.original.id)}
              ariaLabel={`Alias configuration for ${row.original.domain ?? 'zone'}`}
              className='h-7 w-44 text-[10px]'
             title='Select option'/>
        ),
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Tools</div>,
        cell: ({ row }) => (
          <div className='flex justify-end'>
            <Button
              variant='ghost'
              size='xs'
              className='h-7 w-7 p-0 text-rose-400 hover:text-rose-300'
              aria-label={`Delete zone ${row.original.domain ?? ''}`.trim()}
              onClick={() => {
                setZoneToDelete(row.original.id);
              }}
              title={`Delete zone ${row.original.domain ?? ''}`.trim()}>
              <Trash2 className='size-3.5' />
            </Button>
          </div>
        ),
      },
    ],
    [buildAliasOptions, handleAliasChange]
  );

  return (
    <AdminCmsPageLayout
      title='Content Zones'
      current='Zones'
      description='Map CMS content to specific hostnames. Zones allow you to serve different layouts or localized versions of your storefront.'
      icon={<Globe className='size-4' />}
    >
      <div className='space-y-6'>
        <FormSection title='Provision New Zone' className='p-6'>
          <form onSubmit={handleSubmit} className='flex items-end gap-4'>
            <FormField label='Hostname / Domain' error={error} className='flex-1'>
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder='e.g. uk.storefront.com'
                className='h-9'
               aria-label='e.g. uk.storefront.com' title='e.g. uk.storefront.com'/>
            </FormField>
            <Button type='submit' size='sm' className='h-9' loading={createDomain.isPending}>
              <PlusIcon className='size-3.5 mr-2' />
              Add Zone
            </Button>
          </form>
        </FormSection>

        <StandardDataTablePanel
          variant='flat'
          columns={columns}
          data={filteredDomains}
          filters={
            <PanelFilters
              filters={[]}
              values={{}}
              search={search}
              searchPlaceholder='Search zones by domain...'
              onFilterChange={() => {}}
              onSearchChange={setSearch}
              onReset={() => setSearch('')}
              compact
            />
          }
          isLoading={domainsQuery.isLoading}
        />

        <ConfirmModal
          isOpen={Boolean(zoneToDelete)}
          onClose={() => setZoneToDelete(null)}
          title='Remove Content Zone?'
          message='Are you sure you want to remove this domain and its slug assignments? This action cannot be undone.'
          confirmText='Destroy Zone'
          isDangerous={true}
          onConfirm={(): void => {
            if (zoneToDelete) {
              void handleDelete(zoneToDelete);
            }
          }}
        />
      </div>
    </AdminCmsPageLayout>
  );
}
