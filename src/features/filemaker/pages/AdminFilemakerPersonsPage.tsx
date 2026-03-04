'use client';

import { Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useDeferredValue, useMemo, useState } from 'react';

import { Badge, ActionMenu, DropdownMenuItem } from '@/shared/ui';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import {
  FILEMAKER_DATABASE_KEY,
  formatFilemakerAddress,
  parseFilemakerDatabase,
} from '../settings';
import { formatTimestamp, includeQuery } from './filemaker-page-utils';
import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { FilemakerEntityTablePage } from '../components/shared/FilemakerEntityTablePage';

import type { FilemakerPerson } from '../types';
import type { ColumnDef } from '@tanstack/react-table';

export function AdminFilemakerPersonsPage(): React.JSX.Element {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);

  const persons = useMemo(
    () =>
      [...database.persons]
        .filter((person: FilemakerPerson) =>
          includeQuery(
            [
              person.firstName,
              person.lastName,
              person.street,
              person.streetNumber,
              person.city,
              person.postalCode,
              person.country,
              person.countryId,
              person.nip,
              person.regon,
              person.phoneNumbers.join(' '),
            ],
            deferredQuery
          )
        )
        .sort((left: FilemakerPerson, right: FilemakerPerson) =>
          `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`)
        ),
    [database.persons, deferredQuery]
  );

  const columns = useMemo<ColumnDef<FilemakerPerson>[]>(
    () => [
      {
        id: 'person',
        header: 'Person',
        cell: ({ row }) => {
          const person = row.original;
          return (
            <div className='min-w-0 flex-1 space-y-1'>
              <div className='text-sm font-semibold text-white'>
                {person.firstName} {person.lastName}
              </div>
              <div className='text-xs text-gray-300'>{formatFilemakerAddress(person)}</div>
            </div>
          );
        },
      },
      {
        id: 'details',
        header: 'Details',
        cell: ({ row }) => {
          const person = row.original;
          return (
            <div className='space-y-0.5'>
              <div className='text-[11px] text-gray-500'>
                NIP: {person.nip || 'n/a'} | REGON: {person.regon || 'n/a'}
              </div>
              <div className='text-[11px] text-gray-500'>
                Phones: {person.phoneNumbers.length > 0 ? person.phoneNumbers.join(', ') : 'n/a'}
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
          <div className='flex justify-end'>
            <ActionMenu
              ariaLabel={`Actions for person ${row.original.firstName} ${row.original.lastName}`}
            >
              <DropdownMenuItem
                onSelect={(event: Event): void => {
                  event.preventDefault();
                  router.push(`/admin/filemaker/persons/${encodeURIComponent(row.original.id)}`);
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
      title='Filemaker Persons'
      description='Search and browse persons available for Case Resolver document addressing.'
      icon={<Users className='size-4' />}
      actions={buildFilemakerNavActions(router, 'persons')}
      badges={
        <>
          <Badge variant='outline' className='text-[10px]'>
            Persons: {persons.length}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Total Addresses: {database.addresses.length}
          </Badge>
        </>
      }
      query={query}
      onQueryChange={setQuery}
      queryPlaceholder='Search name, address, NIP, REGON, phone...'
      columns={columns}
      data={persons}
      isLoading={settingsStore.isLoading}
      emptyTitle={query ? 'No persons found' : 'No persons found in database.'}
      emptyDescription={
        query ? 'Try adjusting your search terms.' : 'Add your first person to the database.'
      }
    />
  );
}
