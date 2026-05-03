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
import type { FilemakerDatabase } from '../types';
import type { ColumnDef } from '@tanstack/react-table';

type EmailLinkCounts = {
  total: number;
  persons: number;
  organizations: number;
};

const EMPTY_EMAIL_LINK_COUNTS: EmailLinkCounts = {
  total: 0,
  persons: 0,
  organizations: 0,
};

const useEmailLinkCounts = (
  database: FilemakerDatabase
): Map<string, EmailLinkCounts> =>
  useMemo(() => {
    const map = new Map<string, EmailLinkCounts>();
    database.emailLinks.forEach((link) => {
      const current = map.get(link.emailId) ?? EMPTY_EMAIL_LINK_COUNTS;
      map.set(link.emailId, {
        total: current.total + 1,
        persons: current.persons + (link.partyKind === 'person' ? 1 : 0),
        organizations: current.organizations + (link.partyKind === 'organization' ? 1 : 0),
      });
    });
    return map;
  }, [database.emailLinks]);

const useFilteredEmails = (
  database: FilemakerDatabase,
  deferredQuery: string
): FilemakerEmail[] =>
  useMemo(
    (): FilemakerEmail[] =>
      [...database.emails]
        .filter((email: FilemakerEmail) => includeQuery([email.email, email.status], deferredQuery))
        .sort((left: FilemakerEmail, right: FilemakerEmail) =>
          left.email.localeCompare(right.email)
        ),
    [database.emails, deferredQuery]
  );

function EmailIdentityCell({ email }: { email: FilemakerEmail }): React.JSX.Element {
  return (
    <div className='min-w-0 flex-1 space-y-1'>
      <div className='text-sm font-semibold text-white'>{email.email}</div>
      <div className='text-[11px] text-gray-500'>Status: {email.status}</div>
    </div>
  );
}

function EmailLinksCell({ linkCount }: { linkCount: EmailLinkCounts }): React.JSX.Element {
  return (
    <div className='space-y-0.5'>
      <div className='text-[11px] text-gray-500'>Total: {linkCount.total}</div>
      <div className='text-[11px] text-gray-500'>Persons: {linkCount.persons}</div>
      <div className='text-[11px] text-gray-500'>
        Organizations: {linkCount.organizations}
      </div>
    </div>
  );
}

function EmailActionsCell({
  email,
  router,
}: {
  email: FilemakerEmail;
  router: ReturnType<typeof useRouter>;
}): React.JSX.Element {
  return (
    <div className='flex justify-end'>
      <ActionMenu ariaLabel={`Actions for email ${email.email}`}>
        <DropdownMenuItem
          onSelect={(event: Event): void => {
            event.preventDefault();
            startTransition(() => {
              router.push(`/admin/filemaker/emails/${encodeURIComponent(email.id)}`);
            });
          }}
        >
          Edit Details
        </DropdownMenuItem>
      </ActionMenu>
    </div>
  );
}

const useEmailColumns = (
  linkCountsByEmailId: Map<string, EmailLinkCounts>,
  router: ReturnType<typeof useRouter>
): ColumnDef<FilemakerEmail>[] =>
  useMemo<ColumnDef<FilemakerEmail>[]>(
    (): ColumnDef<FilemakerEmail>[] => [
      {
        id: 'email',
        header: 'Email',
        cell: ({ row }) => <EmailIdentityCell email={row.original} />,
      },
      {
        id: 'links',
        header: 'Links',
        cell: ({ row }) => {
          const linkCount = linkCountsByEmailId.get(row.original.id) ?? EMPTY_EMAIL_LINK_COUNTS;
          return <EmailLinksCell linkCount={linkCount} />;
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
        cell: ({ row }) => <EmailActionsCell email={row.original} router={router} />,
      },
    ],
    [linkCountsByEmailId, router]
  );

function EmailPageBadges({
  emailCount,
  linkCount,
}: {
  emailCount: number;
  linkCount: number;
}): React.JSX.Element {
  return (
    <>
      <Badge variant='outline' className='text-[10px]'>
        Emails: {emailCount}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Total Links: {linkCount}
      </Badge>
    </>
  );
}

export function AdminFilemakerEmailsPage(): React.JSX.Element {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());
  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const linkCountsByEmailId = useEmailLinkCounts(database);
  const emails = useFilteredEmails(database, deferredQuery);
  const columns = useEmailColumns(linkCountsByEmailId, router);
  const hasQuery = query !== '';

  return (
    <FilemakerEntityTablePage
      title='Filemaker Emails'
      description='Search and browse emails with linked persons and organizations.'
      icon={<Mail className='size-4' />}
      actions={buildFilemakerNavActions(router, 'emails')}
      badges={<EmailPageBadges emailCount={emails.length} linkCount={database.emailLinks.length} />}
      query={query}
      onQueryChange={setQuery}
      queryPlaceholder='Search email or status...'
      columns={columns}
      data={emails}
      isLoading={settingsStore.isLoading}
      emptyTitle={hasQuery ? 'No emails found' : 'No emails found in database.'}
      emptyDescription={
        hasQuery ? 'Try adjusting your search terms.' : 'Add your first email in Filemaker Database.'
      }
    />
  );
}
