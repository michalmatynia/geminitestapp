'use client';

import { Building2 } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import React, { useDeferredValue, useMemo, useState, startTransition } from 'react';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Badge, DropdownMenuItem } from '@/shared/ui/primitives.public';
import { ActionMenu } from '@/shared/ui/forms-and-actions.public';

import {
  FILEMAKER_DATABASE_KEY,
  formatFilemakerAddress,
  parseFilemakerDatabase,
} from '../settings';
import { formatTimestamp, includeQuery } from './filemaker-page-utils';
import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { FilemakerEntityTablePage } from '../components/shared/FilemakerEntityTablePage';

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

  const columns = useMemo<ColumnDef<FilemakerOrganization>[]>(
    () => [
      {
        id: 'organization',
        header: 'Organization',
        cell: ({ row }) => {
          const organization = row.original;
          return (
            <div className='min-w-0 flex-1 space-y-1'>
              <div className='text-sm font-semibold text-white'>{organization.name}</div>
              <div className='text-xs text-gray-300'>{formatFilemakerAddress(organization)}</div>
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
          <div className='flex justify-end'>
            <ActionMenu ariaLabel={`Actions for organization ${row.original.name}`}>
              <DropdownMenuItem
                onSelect={(event: Event): void => {
                  event.preventDefault();
                  startTransition(() => { router.push(
                                                `/admin/filemaker/organizations/${encodeURIComponent(row.original.id)}`
                                              ); });
                }}
              >
                Edit Details
              </DropdownMenuItem>
            </ActionMenu>
          </div>
        ),
      },
    ],
    [router]
  );

  return (
    <FilemakerEntityTablePage
      title='Filemaker Organizations'
      description='Search and browse organizations available for Case Resolver document addressing.'
      icon={<Building2 className='size-4' />}
      actions={buildFilemakerNavActions(router, 'organizations')}
      badges={
        <>
          <Badge variant='outline' className='text-[10px]'>
            Organizations: {organizations.length}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Total Addresses: {database.addresses.length}
          </Badge>
        </>
      }
      query={query}
      onQueryChange={setQuery}
      queryPlaceholder='Search organization name and address...'
      columns={columns}
      data={organizations}
      isLoading={settingsStore.isLoading}
      emptyTitle={query ? 'No organizations found' : 'No organizations found in database.'}
      emptyDescription={
        query ? 'Try adjusting your search terms.' : 'Add your first organization to the database.'
      }
    />
  );
}
