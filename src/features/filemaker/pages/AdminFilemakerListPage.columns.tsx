import { Edit2 } from 'lucide-react';
import React, { useMemo } from 'react';

import { Button } from '@/shared/ui/primitives.public';

import { formatFilemakerAddress } from '../settings';
import type { FilemakerEvent, FilemakerOrganization, FilemakerPerson } from '../types';

import type { ColumnDef } from '@tanstack/react-table';

type Navigate = (href: string) => void;

export type FilemakerListColumns = {
  events: ColumnDef<FilemakerEvent>[];
  organizations: ColumnDef<FilemakerOrganization>[];
  persons: ColumnDef<FilemakerPerson>[];
};

const renderEditButton = (href: string, onNavigate: Navigate): React.JSX.Element => (
  <div className='flex justify-end'>
    <Button type='button' variant='outline' size='xs' onClick={() => onNavigate(href)}>
      <Edit2 className='mr-1.5 size-3.5' />
      Edit
    </Button>
  </div>
);

const createPersonColumns = (onNavigate: Navigate): ColumnDef<FilemakerPerson>[] => [
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
        <div className='space-y-0.5 text-[11px] text-gray-500'>
          <div>NIP: {person.nip !== '' ? person.nip : 'n/a'}</div>
          <div>Phones: {person.phoneNumbers.length > 0 ? person.phoneNumbers.join(', ') : 'n/a'}</div>
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: () => <div className='text-right'>Actions</div>,
    cell: ({ row }) =>
      renderEditButton(`/admin/filemaker/persons/${encodeURIComponent(row.original.id)}`, onNavigate),
  },
];

const createOrganizationColumns = (
  onNavigate: Navigate
): ColumnDef<FilemakerOrganization>[] => [
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
    cell: ({ row }) =>
      renderEditButton(
        `/admin/filemaker/organizations/${encodeURIComponent(row.original.id)}`,
        onNavigate
      ),
  },
];

const createEventColumns = (onNavigate: Navigate): ColumnDef<FilemakerEvent>[] => [
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
    cell: ({ row }) =>
      renderEditButton(`/admin/filemaker/events/${encodeURIComponent(row.original.id)}`, onNavigate),
  },
];

export const useFilemakerListColumns = (onNavigate: Navigate): FilemakerListColumns =>
  useMemo(
    () => ({
      events: createEventColumns(onNavigate),
      organizations: createOrganizationColumns(onNavigate),
      persons: createPersonColumns(onNavigate),
    }),
    [onNavigate]
  );
