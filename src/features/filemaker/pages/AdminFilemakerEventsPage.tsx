'use client';

import { CalendarDays, Building2, Users, Mail, Database } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useDeferredValue, useMemo, useState } from 'react';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Badge,
  StandardDataTablePanel,
  PanelHeader,
  SearchInput,
  EmptyState,
  ActionMenu,
  DropdownMenuItem,
} from '@/shared/ui';

import {
  FILEMAKER_DATABASE_KEY,
  formatFilemakerAddress,
  parseFilemakerDatabase,
} from '../settings';
import { formatTimestamp, includeQuery } from './filemaker-page-utils';

import type { FilemakerEvent } from '../types';
import type { ColumnDef } from '@tanstack/react-table';

export function AdminFilemakerEventsPage(): React.JSX.Element {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);

  const organizationsCountByEventId = useMemo(() => {
    const map = new Map<string, number>();
    database.eventOrganizationLinks.forEach((link) => {
      map.set(link.eventId, (map.get(link.eventId) ?? 0) + 1);
    });
    return map;
  }, [database.eventOrganizationLinks]);

  const events = useMemo(
    () =>
      [...database.events]
        .filter((event: FilemakerEvent) =>
          includeQuery(
            [
              event.eventName,
              event.street,
              event.streetNumber,
              event.city,
              event.postalCode,
              event.country,
              event.countryId,
            ],
            deferredQuery
          )
        )
        .sort((left: FilemakerEvent, right: FilemakerEvent) =>
          left.eventName.localeCompare(right.eventName)
        ),
    [database.events, deferredQuery]
  );

  const columns = useMemo<ColumnDef<FilemakerEvent>[]>(() => [
    {
      id: 'event',
      header: 'Event',
      cell: ({ row }) => {
        const event = row.original;
        return (
          <div className='min-w-0 flex-1 space-y-1'>
            <div className='text-sm font-semibold text-white'>
              {event.eventName}
            </div>
            <div className='text-xs text-gray-300'>
              {formatFilemakerAddress(event)}
            </div>
          </div>
        );
      },
    },
    {
      id: 'linkedOrganizations',
      header: 'Linked Organizations',
      cell: ({ row }) => (
        <span className='text-[11px] text-gray-500'>
          {organizationsCountByEventId.get(row.original.id) ?? 0}
        </span>
      ),
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
          <ActionMenu ariaLabel={`Actions for event ${row.original.eventName}`}>
            <DropdownMenuItem
              onSelect={(event: Event): void => {
                event.preventDefault();
                router.push(`/admin/filemaker/events/${encodeURIComponent(row.original.id)}`);
              }}
            >
              Edit Details
            </DropdownMenuItem>
          </ActionMenu>
        </div>
      ),
    },
  ], [organizationsCountByEventId, router]);

  return (
    <div className='container mx-auto space-y-6 py-8'>
      <PanelHeader
        title='Filemaker Events'
        description='Search and browse events with linked organizations.'
        icon={<CalendarDays className='size-4' />}
        actions={[
          {
            key: 'organizations',
            label: 'Organizations',
            icon: <Building2 className='size-4' />,
            variant: 'outline',
            onClick: () => router.push('/admin/filemaker/organizations'),
          },
          {
            key: 'persons',
            label: 'Persons',
            icon: <Users className='size-4' />,
            variant: 'outline',
            onClick: () => router.push('/admin/filemaker/persons'),
          },
          {
            key: 'emails',
            label: 'Emails',
            icon: <Mail className='size-4' />,
            variant: 'outline',
            onClick: () => router.push('/admin/filemaker/emails'),
          },
          {
            key: 'manage',
            label: 'Manage Database',
            icon: <Database className='size-4' />,
            onClick: () => router.push('/admin/filemaker'),
          },
        ]}
      />

      <StandardDataTablePanel
        filters={
          <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div className='flex items-center gap-2'>
              <Badge variant='outline' className='text-[10px]'>
                Events: {events.length}
              </Badge>
              <Badge variant='outline' className='text-[10px]'>
                Event Links: {database.eventOrganizationLinks.length}
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
                placeholder='Search event name and address...'
                size='sm'
              />
            </div>
          </div>
        }
        columns={columns}
        data={events}
        isLoading={settingsStore.isLoading}
        emptyState={
          <EmptyState
            title={query ? 'No events found' : 'No events found in database.'}
            description={query ? 'Try adjusting your search terms.' : 'Add your first event to the database.'}
          />
        }
      />
    </div>
  );
}
