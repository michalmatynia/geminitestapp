'use client';

import { Mail, Users, Building2, CalendarDays, Database } from 'lucide-react';
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

import { FILEMAKER_DATABASE_KEY, parseFilemakerDatabase } from '../settings';
import { formatTimestamp, includeQuery } from './filemaker-page-utils';

import type { FilemakerEmail } from '../types';
import type { ColumnDef } from '@tanstack/react-table';

export function AdminFilemakerEmailsPage(): React.JSX.Element {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);

  const linkCountsByEmailId = useMemo(() => {
    const map = new Map<string, { total: number; persons: number; organizations: number }>();
    database.emailLinks.forEach((link) => {
      const current = map.get(link.emailId) ?? {
        total: 0,
        persons: 0,
        organizations: 0,
      };
      map.set(link.emailId, {
        total: current.total + 1,
        persons: current.persons + (link.partyKind === 'person' ? 1 : 0),
        organizations: current.organizations + (link.partyKind === 'organization' ? 1 : 0),
      });
    });
    return map;
  }, [database.emailLinks]);

  const emails = useMemo(
    () =>
      [...database.emails]
        .filter((email: FilemakerEmail) => includeQuery([email.email, email.status], deferredQuery))
        .sort((left: FilemakerEmail, right: FilemakerEmail) =>
          left.email.localeCompare(right.email)
        ),
    [database.emails, deferredQuery]
  );

  const columns = useMemo<ColumnDef<FilemakerEmail>[]>(
    () => [
      {
        id: 'email',
        header: 'Email',
        cell: ({ row }) => {
          const email = row.original;
          return (
            <div className='min-w-0 flex-1 space-y-1'>
              <div className='text-sm font-semibold text-white'>{email.email}</div>
              <div className='text-[11px] text-gray-500'>Status: {email.status}</div>
            </div>
          );
        },
      },
      {
        id: 'links',
        header: 'Links',
        cell: ({ row }) => {
          const linkCount = linkCountsByEmailId.get(row.original.id) ?? {
            total: 0,
            persons: 0,
            organizations: 0,
          };
          return (
            <div className='space-y-0.5'>
              <div className='text-[11px] text-gray-500'>Total: {linkCount.total}</div>
              <div className='text-[11px] text-gray-500'>Persons: {linkCount.persons}</div>
              <div className='text-[11px] text-gray-500'>
                Organizations: {linkCount.organizations}
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
            <ActionMenu ariaLabel={`Actions for email ${row.original.email}`}>
              <DropdownMenuItem
                onSelect={(event: Event): void => {
                  event.preventDefault();
                  router.push(`/admin/filemaker/emails/${encodeURIComponent(row.original.id)}`);
                }}
              >
                Edit Details
              </DropdownMenuItem>
            </ActionMenu>
          </div>
        ),
      },
    ],
    [linkCountsByEmailId, router]
  );

  return (
    <div className='container mx-auto space-y-6 py-8'>
      <PanelHeader
        title='Filemaker Emails'
        description='Search and browse emails with linked persons and organizations.'
        icon={<Mail className='size-4' />}
        actions={[
          {
            key: 'persons',
            label: 'Persons',
            icon: <Users className='size-4' />,
            variant: 'outline',
            onClick: () => router.push('/admin/filemaker/persons'),
          },
          {
            key: 'organizations',
            label: 'Organizations',
            icon: <Building2 className='size-4' />,
            variant: 'outline',
            onClick: () => router.push('/admin/filemaker/organizations'),
          },
          {
            key: 'events',
            label: 'Events',
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

      <StandardDataTablePanel
        filters={
          <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div className='flex items-center gap-2'>
              <Badge variant='outline' className='text-[10px]'>
                Emails: {emails.length}
              </Badge>
              <Badge variant='outline' className='text-[10px]'>
                Total Links: {database.emailLinks.length}
              </Badge>
            </div>
            <div className='w-full max-w-sm'>
              <SearchInput
                value={query}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  setQuery(event.target.value);
                }}
                onClear={() => setQuery('')}
                placeholder='Search email or status...'
                size='sm'
              />
            </div>
          </div>
        }
        columns={columns}
        data={emails}
        isLoading={settingsStore.isLoading}
        emptyState={
          <EmptyState
            title={query ? 'No emails found' : 'No emails found in database.'}
            description={
              query
                ? 'Try adjusting your search terms.'
                : 'Add your first email in Filemaker Database.'
            }
          />
        }
      />
    </div>
  );
}
