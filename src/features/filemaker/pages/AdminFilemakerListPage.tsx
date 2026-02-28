'use client';

import { Edit2, LayoutList, Users, Building2, CalendarDays, Database, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useDeferredValue, useMemo, useState } from 'react';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Badge,
  Button,
  StandardDataTablePanel,
  PanelHeader,
  SearchInput,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  EmptyState,
} from '@/shared/ui';

import {
  FILEMAKER_DATABASE_KEY,
  formatFilemakerAddress,
  parseFilemakerDatabase,
} from '../settings';

import type { FilemakerEvent, FilemakerOrganization, FilemakerPerson } from '../types';
import type { ColumnDef } from '@tanstack/react-table';

const includeQuery = (values: string[], query: string): boolean => {
  if (!query) return true;
  return values.join(' ').toLowerCase().includes(query.toLowerCase());
};

export function AdminFilemakerListPage(): React.JSX.Element {
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

  const personColumns = useMemo<ColumnDef<FilemakerPerson>[]>(
    () => [
      {
        id: 'person',
        header: 'Person',
        cell: ({ row }) => {
          const person = row.original;
          return (
            <div className='min-w-0 space-y-1'>
              <div className='text-sm font-semibold text-white'>
                {person.firstName} {person.lastName}
              </div>
              <div className='text-xs text-gray-300'>{formatFilemakerAddress(person)}</div>
            </div>
          );
        },
      },
      {
        id: 'contact',
        header: 'Contact',
        cell: ({ row }) => {
          const person = row.original;
          return (
            <div className='text-[11px] text-gray-500 space-y-0.5'>
              <div>NIP: {person.nip || 'n/a'}</div>
              <div>
                Phones: {person.phoneNumbers.length > 0 ? person.phoneNumbers.join(', ') : 'n/a'}
              </div>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({ row }) => (
          <div className='flex justify-end'>
            <Button
              type='button'
              variant='outline'
              size='xs'
              onClick={() =>
                router.push(`/admin/filemaker/persons/${encodeURIComponent(row.original.id)}`)
              }
            >
              <Edit2 className='mr-1.5 size-3.5' />
              Edit
            </Button>
          </div>
        ),
      },
    ],
    [router]
  );

  const orgColumns = useMemo<ColumnDef<FilemakerOrganization>[]>(
    () => [
      {
        id: 'organization',
        header: 'Organization',
        cell: ({ row }) => {
          const organization = row.original;
          return (
            <div className='min-w-0 space-y-1'>
              <div className='text-sm font-semibold text-white'>{organization.name}</div>
              <div className='text-xs text-gray-300'>{formatFilemakerAddress(organization)}</div>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({ row }) => (
          <div className='flex justify-end'>
            <Button
              type='button'
              variant='outline'
              size='xs'
              onClick={() =>
                router.push(`/admin/filemaker/organizations/${encodeURIComponent(row.original.id)}`)
              }
            >
              <Edit2 className='mr-1.5 size-3.5' />
              Edit
            </Button>
          </div>
        ),
      },
    ],
    [router]
  );
  const eventColumns = useMemo<ColumnDef<FilemakerEvent>[]>(
    () => [
      {
        id: 'event',
        header: 'Event',
        cell: ({ row }) => {
          const event = row.original;
          return (
            <div className='min-w-0 space-y-1'>
              <div className='text-sm font-semibold text-white'>{event.eventName}</div>
              <div className='text-xs text-gray-300'>{formatFilemakerAddress(event)}</div>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({ row }) => (
          <div className='flex justify-end'>
            <Button
              type='button'
              variant='outline'
              size='xs'
              onClick={() =>
                router.push(`/admin/filemaker/events/${encodeURIComponent(row.original.id)}`)
              }
            >
              <Edit2 className='mr-1.5 size-3.5' />
              Edit
            </Button>
          </div>
        ),
      },
    ],
    [router]
  );

  return (
    <div className='container mx-auto space-y-6 py-8'>
      <PanelHeader
        title='Filemaker List'
        description='Search persons, organizations, and events available for Case Resolver document addressing.'
        icon={<LayoutList className='size-4' />}
        actions={[
          {
            key: 'persons',
            label: 'Persons Page',
            icon: <Users className='size-4' />,
            variant: 'outline',
            onClick: () => router.push('/admin/filemaker/persons'),
          },
          {
            key: 'organizations',
            label: 'Organizations Page',
            icon: <Building2 className='size-4' />,
            variant: 'outline',
            onClick: () => router.push('/admin/filemaker/organizations'),
          },
          {
            key: 'emails',
            label: 'Emails Page',
            icon: <Mail className='size-4' />,
            variant: 'outline',
            onClick: () => router.push('/admin/filemaker/emails'),
          },
          {
            key: 'events',
            label: 'Events Page',
            icon: <CalendarDays className='size-4' />,
            variant: 'outline',
            onClick: () => router.push('/admin/filemaker/events'),
          },
          {
            key: 'manage',
            label: 'Manage Database',
            icon: <Database className='size-4' />,
            onClick: () => router.push('/admin/filemaker'),
          },
        ]}
      />

      <Tabs defaultValue='persons' className='w-full'>
        <TabsList className='mb-4'>
          <TabsTrigger value='persons' className='gap-2'>
            <Users className='size-3.5' />
            Persons
          </TabsTrigger>
          <TabsTrigger value='organizations' className='gap-2'>
            <Building2 className='size-3.5' />
            Organizations
          </TabsTrigger>
          <TabsTrigger value='events' className='gap-2'>
            <CalendarDays className='size-3.5' />
            Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value='persons' className='m-0'>
          <StandardDataTablePanel
            filters={
              <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline' className='text-[10px]'>
                    Persons: {persons.length}
                  </Badge>
                  <Badge variant='outline' className='text-[10px]'>
                    Organizations: {organizations.length}
                  </Badge>
                  <Badge variant='outline' className='text-[10px]'>
                    Events: {events.length}
                  </Badge>
                  <Badge variant='outline' className='text-[10px]'>
                    Emails: {database.emails.length}
                  </Badge>
                  <Badge variant='outline' className='text-[10px]'>
                    Addresses: {database.addresses.length}
                  </Badge>
                </div>
                <div className='w-full max-w-sm'>
                  <SearchInput
                    value={query}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      setQuery(event.target.value);
                    }}
                    onClear={() => setQuery('')}
                    placeholder='Search name, address, NIP, REGON, phone...'
                    size='sm'
                  />
                </div>
              </div>
            }
            columns={personColumns}
            data={persons}
            isLoading={settingsStore.isLoading}
            variant='flat'
            emptyState={
              <EmptyState
                title={query ? 'No persons found' : 'No persons yet'}
                description={
                  query
                    ? 'Try adjusting your search terms.'
                    : 'Add your first person to the database.'
                }
              />
            }
          />
        </TabsContent>

        <TabsContent value='organizations' className='m-0'>
          <StandardDataTablePanel
            filters={
              <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline' className='text-[10px]'>
                    Persons: {persons.length}
                  </Badge>
                  <Badge variant='outline' className='text-[10px]'>
                    Organizations: {organizations.length}
                  </Badge>
                  <Badge variant='outline' className='text-[10px]'>
                    Events: {events.length}
                  </Badge>
                  <Badge variant='outline' className='text-[10px]'>
                    Emails: {database.emails.length}
                  </Badge>
                  <Badge variant='outline' className='text-[10px]'>
                    Addresses: {database.addresses.length}
                  </Badge>
                </div>
                <div className='w-full max-w-sm'>
                  <SearchInput
                    value={query}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      setQuery(event.target.value);
                    }}
                    onClear={() => setQuery('')}
                    placeholder='Search name, address, NIP, REGON, phone...'
                    size='sm'
                  />
                </div>
              </div>
            }
            columns={orgColumns}
            data={organizations}
            isLoading={settingsStore.isLoading}
            variant='flat'
            emptyState={
              <EmptyState
                title={query ? 'No organizations found' : 'No organizations yet'}
                description={
                  query
                    ? 'Try adjusting your search terms.'
                    : 'Add your first organization to the database.'
                }
              />
            }
          />
        </TabsContent>

        <TabsContent value='events' className='m-0'>
          <StandardDataTablePanel
            filters={
              <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline' className='text-[10px]'>
                    Persons: {persons.length}
                  </Badge>
                  <Badge variant='outline' className='text-[10px]'>
                    Organizations: {organizations.length}
                  </Badge>
                  <Badge variant='outline' className='text-[10px]'>
                    Events: {events.length}
                  </Badge>
                  <Badge variant='outline' className='text-[10px]'>
                    Emails: {database.emails.length}
                  </Badge>
                  <Badge variant='outline' className='text-[10px]'>
                    Event Links: {database.eventOrganizationLinks.length}
                  </Badge>
                  <Badge variant='outline' className='text-[10px]'>
                    Addresses: {database.addresses.length}
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
            columns={eventColumns}
            data={events}
            isLoading={settingsStore.isLoading}
            variant='flat'
            emptyState={
              <EmptyState
                title={query ? 'No events found' : 'No events yet'}
                description={
                  query
                    ? 'Try adjusting your search terms.'
                    : 'Add your first event to the database.'
                }
              />
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
