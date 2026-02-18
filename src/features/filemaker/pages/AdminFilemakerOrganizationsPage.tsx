'use client';

import { Edit2, Building2, Users, Database } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useDeferredValue, useMemo, useState } from 'react';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { 
  Badge, 
  Button, 
  DataTable, 
  ListPanel, 
  PanelHeader, 
  SearchInput,
  EmptyState
} from '@/shared/ui';

import {
  FILEMAKER_DATABASE_KEY,
  formatFilemakerAddress,
  parseFilemakerDatabase,
} from '../settings';
import { formatTimestamp, includeQuery } from './filemaker-page-utils';

import type { FilemakerOrganization } from '../types';
import type { ColumnDef } from '@tanstack/react-table';

export function AdminFilemakerOrganizationsPage(): React.JSX.Element {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);

  const organizations = useMemo(
    () =>
      [...database.organizations]
        .filter((organization: FilemakerOrganization) =>
          includeQuery(
            [
              organization.name,
              organization.street,
              organization.streetNumber,
              organization.city,
              organization.postalCode,
              organization.country,
              organization.countryId,
            ],
            deferredQuery
          )
        )
        .sort((left: FilemakerOrganization, right: FilemakerOrganization) =>
          left.name.localeCompare(right.name)
        ),
    [database.organizations, deferredQuery]
  );

  const columns = useMemo<ColumnDef<FilemakerOrganization>[]>(() => [
    {
      id: 'organization',
      header: 'Organization',
      cell: ({ row }) => {
        const organization = row.original;
        return (
          <div className='min-w-0 flex-1 space-y-1'>
            <div className='text-sm font-semibold text-white'>
              {organization.name}
            </div>
            <div className='text-xs text-gray-300'>
              {formatFilemakerAddress(organization)}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: ({ row }) => (
        <span className='text-[10px] text-gray-600'>
          {formatTimestamp(row.original.updatedAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className='text-right'>Actions</div>,
      cell: ({ row }) => (
        <div className='flex justify-end gap-2'>
          <Button 
            type='button' 
            variant='outline' 
            size='xs'
            onClick={() => router.push(`/admin/filemaker/organizations/${encodeURIComponent(row.original.id)}`)}
          >
            <Edit2 className='mr-1.5 size-3.5' />
            Edit
          </Button>
        </div>
      ),
    },
  ], [router]);

  return (
    <div className='container mx-auto space-y-6 py-8'>
      <PanelHeader
        title='Filemaker Organizations'
        description='Search and browse organizations available for Case Resolver document addressing.'
        icon={<Building2 className='size-4' />}
        actions={[
          {
            key: 'persons',
            label: 'Persons',
            icon: <Users className='size-4' />,
            variant: 'outline',
            onClick: () => router.push('/admin/filemaker/persons'),
          },
          {
            key: 'manage',
            label: 'Manage Database',
            icon: <Database className='size-4' />,
            onClick: () => router.push('/admin/filemaker'),
          }
        ]}
      />

      <ListPanel
        filters={
          <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div className='flex items-center gap-2'>
              <Badge variant='outline' className='text-[10px]'>
                Organizations: {organizations.length}
              </Badge>
              <Badge variant='outline' className='text-[10px]'>
                Total Addresses: {database.addresses.length}
              </Badge>
            </div>
            <div className='w-full max-w-sm'>
              <SearchInput
                value={query}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  setQuery(event.target.value);
                }}
                onClear={() => setQuery('')}
                placeholder='Search organization name and address...'
                size='sm'
              />
            </div>
          </div>
        }
      >
        <DataTable
          columns={columns}
          data={organizations}
          isLoading={settingsStore.isLoading}
          emptyState={
            <EmptyState
              title={query ? 'No organizations found' : 'No organizations found in database.'}
              description={query ? 'Try adjusting your search terms.' : 'Add your first organization to the database.'}
            />
          }
        />
      </ListPanel>
    </div>
  );
}
