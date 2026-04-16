'use client';

import { Mail } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import React, { useDeferredValue, useMemo, useState, startTransition } from 'react';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Badge, DropdownMenuItem } from '@/shared/ui/primitives.public';
import { ActionMenu } from '@/shared/ui/forms-and-actions.public';

import { FILEMAKER_DATABASE_KEY, parseFilemakerDatabase } from '../settings';
import { formatTimestamp, includeQuery } from './filemaker-page-utils';
import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { FilemakerEntityTablePage } from '../components/shared/FilemakerEntityTablePage';

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
                  startTransition(() => { router.push(`/admin/filemaker/emails/${encodeURIComponent(row.original.id)}`); });
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
    <FilemakerEntityTablePage
      title='Filemaker Emails'
      description='Search and browse emails with linked persons and organizations.'
      icon={<Mail className='size-4' />}
      actions={buildFilemakerNavActions(router, 'emails')}
      badges={
        <>
          <Badge variant='outline' className='text-[10px]'>
            Emails: {emails.length}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Total Links: {database.emailLinks.length}
          </Badge>
        </>
      }
      query={query}
      onQueryChange={setQuery}
      queryPlaceholder='Search email or status...'
      columns={columns}
      data={emails}
      isLoading={settingsStore.isLoading}
      emptyTitle={query ? 'No emails found' : 'No emails found in database.'}
      emptyDescription={
        query ? 'Try adjusting your search terms.' : 'Add your first email in Filemaker Database.'
      }
    />
  );
}
