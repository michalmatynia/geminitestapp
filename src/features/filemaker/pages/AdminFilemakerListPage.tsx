'use client';

import { Edit2 } from 'lucide-react';
import Link from 'next/link';
import React, { useDeferredValue, useMemo, useState } from 'react';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Badge, Button, FormSection, SearchInput, SectionHeader } from '@/shared/ui';

import {
  FILEMAKER_DATABASE_KEY,
  formatFilemakerAddress,
  parseFilemakerDatabase,
} from '../settings';

import type { FilemakerOrganization, FilemakerPerson } from '../types';

const includeQuery = (values: string[], query: string): boolean => {
  if (!query) return true;
  return values.join(' ').toLowerCase().includes(query.toLowerCase());
};

export function AdminFilemakerListPage(): React.JSX.Element {
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

  return (
    <div className='container mx-auto space-y-6 py-8'>
      <SectionHeader
        title='Filemaker List'
        description='Search persons and organizations available for Case Resolver document addressing.'
      />

      <div className='flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-4 md:flex-row md:items-center md:justify-between'>
        <div className='flex items-center gap-2'>
          <Badge variant='outline' className='text-[10px]'>Persons: {persons.length}</Badge>
          <Badge variant='outline' className='text-[10px]'>Organizations: {organizations.length}</Badge>
          <Badge variant='outline' className='text-[10px]'>Addresses: {database.addresses.length}</Badge>
        </div>
        <div className='w-full max-w-sm'>
          <SearchInput
            value={query}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              setQuery(event.target.value);
            }}
            placeholder='Search name, address, NIP, REGON, phone...'
          />
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button asChild type='button' variant='outline' className='h-9 whitespace-nowrap'>
            <Link href='/admin/filemaker/persons'>Persons Page</Link>
          </Button>
          <Button asChild type='button' variant='outline' className='h-9 whitespace-nowrap'>
            <Link href='/admin/filemaker/organizations'>Organizations Page</Link>
          </Button>
          <Button asChild type='button' className='h-9 whitespace-nowrap'>
            <Link href='/admin/filemaker'>Manage Database</Link>
          </Button>
        </div>
      </div>

      <FormSection title='Persons' className='space-y-3 p-4'>
        {persons.length === 0 ? (
          <div className='rounded border border-dashed border-border/60 bg-card/20 px-3 py-6 text-sm text-gray-400'>
            No persons found.
          </div>
        ) : (
          <div className='space-y-2'>
            {persons.map((person: FilemakerPerson) => (
              <div key={person.id} className='rounded border border-border/60 bg-card/35 px-3 py-2'>
                <div className='flex flex-wrap items-start justify-between gap-2'>
                  <div className='min-w-0 space-y-1'>
                    <div className='text-sm font-semibold text-white'>
                      {person.firstName} {person.lastName}
                    </div>
                    <div className='text-xs text-gray-300'>{formatFilemakerAddress(person)}</div>
                    <div className='text-[11px] text-gray-500'>
                      NIP: {person.nip || 'n/a'} | REGON: {person.regon || 'n/a'}
                    </div>
                    <div className='text-[11px] text-gray-500'>
                      Phones:{' '}
                      {person.phoneNumbers.length > 0
                        ? person.phoneNumbers.join(', ')
                        : 'n/a'}
                    </div>
                  </div>
                  <Button type='button' variant='outline' size='sm' className='h-8' asChild>
                    <Link href={`/admin/filemaker/persons/${encodeURIComponent(person.id)}`}>
                      <Edit2 className='mr-1.5 size-3.5' />
                      Edit
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </FormSection>

      <FormSection title='Organizations' className='space-y-3 p-4'>
        {organizations.length === 0 ? (
          <div className='rounded border border-dashed border-border/60 bg-card/20 px-3 py-6 text-sm text-gray-400'>
            No organizations found.
          </div>
        ) : (
          <div className='space-y-2'>
            {organizations.map((organization: FilemakerOrganization) => (
              <div key={organization.id} className='rounded border border-border/60 bg-card/35 px-3 py-2'>
                <div className='flex flex-wrap items-start justify-between gap-2'>
                  <div className='min-w-0 space-y-1'>
                    <div className='text-sm font-semibold text-white'>{organization.name}</div>
                    <div className='text-xs text-gray-300'>
                      {formatFilemakerAddress(organization)}
                    </div>
                  </div>
                  <Button type='button' variant='outline' size='sm' className='h-8' asChild>
                    <Link
                      href={`/admin/filemaker/organizations/${encodeURIComponent(organization.id)}`}
                    >
                      <Edit2 className='mr-1.5 size-3.5' />
                      Edit
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </FormSection>
    </div>
  );
}
