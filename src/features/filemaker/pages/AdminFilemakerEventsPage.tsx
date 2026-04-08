'use client';

import { CalendarDays } from 'lucide-react';
import { useRouter } from 'next/navigation';
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

  const columns = useMemo<ColumnDef<FilemakerEvent>[]>(
    () => [
      {
        id: 'event',
        header: 'Event',
        cell: ({ row }) => {
          const event = row.original;
          return (
            <div className='min-w-0 flex-1 space-y-1'>
              <div className='text-sm font-semibold text-white'>{event.eventName}</div>
              <div className='text-xs text-gray-300'>{formatFilemakerAddress(event)}</div>
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
                  startTransition(() => { router.push(`/admin/filemaker/events/${encodeURIComponent(row.original.id)}`); });
                }}
              >
                Edit Details
              </DropdownMenuItem>
            </ActionMenu>
          </div>
        ),
      },
    ],
    [organizationsCountByEventId, router]
  );

  return (
    <FilemakerEntityTablePage
      title='Filemaker Events'
      description='Search and browse events with linked organizations.'
      icon={<CalendarDays className='size-4' />}
      actions={buildFilemakerNavActions(router, 'events')}
      badges={
        <>
          <Badge variant='outline' className='text-[10px]'>
            Events: {events.length}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Event Links: {database.eventOrganizationLinks.length}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Total Addresses: {database.addresses.length}
          </Badge>
        </>
      }
      query={query}
      onQueryChange={setQuery}
      queryPlaceholder='Search event name and address...'
      columns={columns}
      data={events}
      isLoading={settingsStore.isLoading}
      emptyTitle={query ? 'No events found' : 'No events found in database.'}
      emptyDescription={
        query ? 'Try adjusting your search terms.' : 'Add your first event to the database.'
      }
    />
  );
}
