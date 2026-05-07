'use client';

import { Mail } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import React, {
  startTransition,
  useDeferredValue,
  useMemo,
  useState,
} from 'react';

import { Badge, DropdownMenuItem } from '@/shared/ui/primitives.public';
import { ActionMenu } from '@/shared/ui/forms-and-actions.public';
import { Pagination } from '@/shared/ui/navigation-and-layout.public';

import { formatTimestamp, includeQuery } from './filemaker-page-utils';
import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { FilemakerEntityTablePage } from '../components/shared/FilemakerEntityTablePage';
import {
  DEFAULT_EMAIL_PAGE_SIZE,
  DEFAULT_EMAIL_SORT,
  EMAIL_PAGE_SIZE_OPTIONS,
  useDebouncedValue,
  useMongoFilemakerEmails,
  type EmailLinkCounts,
} from './AdminFilemakerEmailsPage.hooks';

import type { FilemakerEmail } from '../types';
import type { ColumnDef } from '@tanstack/react-table';

const EMPTY_EMAIL_LINK_COUNTS: EmailLinkCounts = {
  total: 0,
  persons: 0,
  organizations: 0,
};

const useFilteredEmails = (
  emails: FilemakerEmail[],
  deferredQuery: string
): FilemakerEmail[] =>
  useMemo(
    (): FilemakerEmail[] =>
      [...emails]
        .filter((email: FilemakerEmail) => includeQuery([email.email, email.status], deferredQuery))
        .sort((left: FilemakerEmail, right: FilemakerEmail) =>
          left.email.localeCompare(right.email)
        ),
    [emails, deferredQuery]
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
  collectionCount,
  shownCount,
  totalCount,
  linkCount,
}: {
  collectionCount: number;
  shownCount: number;
  totalCount: number;
  linkCount: number;
}): React.JSX.Element {
  return (
    <>
      <Badge variant='outline' className='text-[10px]'>
        Emails: {totalCount.toLocaleString()} / {collectionCount.toLocaleString()}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Showing: {shownCount.toLocaleString()}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Total Links: {linkCount.toLocaleString()}
      </Badge>
    </>
  );
}

function EmailTableControls({
  error,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  error: string | null;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (value: number) => void;
  onPageSizeChange: (value: number) => void;
}): React.JSX.Element {
  return (
    <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
      {error !== null ? (
        <div className='rounded border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs text-red-200'>
          {error}
        </div>
      ) : (
        <div aria-hidden='true' />
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={EMAIL_PAGE_SIZE_OPTIONS}
        showPageSize
        showLabels={false}
        showPageJump
        variant='compact'
      />
    </div>
  );
}

export function AdminFilemakerEmailsPage(): React.JSX.Element {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_EMAIL_PAGE_SIZE);
  const deferredQuery = useDeferredValue(query.trim());
  const debouncedQuery = useDebouncedValue(deferredQuery, 250);
  const mongoEmails = useMongoFilemakerEmails({ page, pageSize, query: debouncedQuery, sort: DEFAULT_EMAIL_SORT });
  const linkCountsByEmailId = useMemo(
    () => new Map<string, EmailLinkCounts>(Object.entries(mongoEmails.linkCountsByEmailId)),
    [mongoEmails.linkCountsByEmailId]
  );
  const emails = useFilteredEmails(mongoEmails.emails, deferredQuery);
  const columns = useEmailColumns(linkCountsByEmailId, router);
  const hasQuery = query !== '';
  const emptyDescription = hasQuery
    ? 'Try adjusting your search terms.'
    : 'Import emails into Filemaker Mongo first.';

  return (
    <FilemakerEntityTablePage
      title='Filemaker Emails'
      description='Search and browse emails with linked persons and organizations.'
      icon={<Mail className='size-4' />}
      actions={buildFilemakerNavActions(router, 'emails')}
      badges={
        <EmailPageBadges
          collectionCount={mongoEmails.collectionCount}
          shownCount={emails.length}
          totalCount={mongoEmails.totalCount}
          linkCount={mongoEmails.linkCount}
        />
      }
      query={query}
      onQueryChange={(value: string): void => {
        setQuery(value);
        setPage(1);
      }}
      queryPlaceholder='Search email or status...'
      columns={columns}
      data={emails}
      isLoading={mongoEmails.isLoading}
      emptyTitle={hasQuery ? 'No emails found' : 'No emails found in database.'}
      emptyDescription={emptyDescription}
      headerSlot={
        <EmailTableControls
          error={mongoEmails.error}
          page={mongoEmails.page}
          pageSize={mongoEmails.pageSize}
          totalPages={mongoEmails.totalPages}
          onPageChange={setPage}
          onPageSizeChange={(value: number): void => { setPageSize(value); setPage(1); }}
        />
      }
    />
  );
}
