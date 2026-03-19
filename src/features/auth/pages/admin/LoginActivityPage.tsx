'use client';

import { ActivityIcon } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';

import { ActivityTypes } from '@/shared/constants/observability';
import type { ActivityLog } from '@/shared/contracts/system';
import { useSystemActivity } from '@/shared/hooks/useSystemActivity';
import {
  EmptyState,
  PageLayout,
  Pagination,
  SearchInput,
  StandardDataTablePanel,
  StatusBadge,
  UI_CENTER_ROW_RELAXED_CLASSNAME,
} from '@/shared/ui';
import { formatDateTime } from '@/shared/utils';

const PAGE_SIZE = 25;
const LOGIN_DESCRIPTION_PREFIX = 'User logged in:';

const readLoginIdentity = (log: ActivityLog): string => {
  if (log.description.startsWith(LOGIN_DESCRIPTION_PREFIX)) {
    const identity = log.description.slice(LOGIN_DESCRIPTION_PREFIX.length).trim();
    if (identity) return identity;
  }

  return log.description || 'Unknown account';
};

const readMetadataText = (log: ActivityLog, key: string): string | null => {
  const value = log.metadata?.[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export default function AuthLoginActivityPage(): React.JSX.Element {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());

  useEffect(() => {
    setPage(1);
  }, [deferredSearch]);

  const query = useSystemActivity({
    page,
    pageSize: PAGE_SIZE,
    search: deferredSearch || undefined,
    type: ActivityTypes.AUTH.LOGIN,
  });

  const activity = query.data?.data ?? [];
  const total = query.data?.total ?? 0;

  const columns = useMemo<ColumnDef<ActivityLog>[]>(
    () => [
      {
        id: 'identity',
        header: 'User',
        cell: ({ row }) => (
          <div className='flex flex-col'>
            <span className='font-medium text-gray-200'>{readLoginIdentity(row.original)}</span>
            <span className='font-mono text-[10px] text-gray-500'>
              {row.original.userId ?? 'unknown-user'}
            </span>
          </div>
        ),
      },
      {
        id: 'context',
        header: 'Context',
        cell: ({ row }) => {
          const surface = readMetadataText(row.original, 'surface');
          const authFlow = readMetadataText(row.original, 'authFlow');
          const loginMethod = readMetadataText(row.original, 'loginMethod');

          return (
            <div className='flex flex-col gap-2'>
              <div className='flex flex-wrap gap-1.5'>
                <StatusBadge
                  status={surface === 'kangur' ? 'Kangur' : 'Main App'}
                  variant={surface === 'kangur' ? 'info' : 'neutral'}
                  size='sm'
                />
                {loginMethod ? (
                  <StatusBadge status={loginMethod} variant='neutral' size='sm' className='font-mono' />
                ) : null}
                {authFlow ? (
                  <StatusBadge status={authFlow} variant='neutral' size='sm' className='font-mono' />
                ) : null}
              </div>
              <span className='text-xs text-gray-500'>{row.original.description}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Logged In',
        cell: ({ row }) => (
          <span className='font-mono text-xs text-gray-500'>
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <PageLayout
      title='Login Activity'
      description='Review successful auth sign-ins recorded across the application.'
      icon={<ActivityIcon className='size-4' />}
      refresh={{
        onRefresh: () => {
          void query.refetch();
        },
        isRefreshing: query.isFetching,
      }}
      containerClassName='mx-auto w-full max-w-none py-10'
    >
      <StandardDataTablePanel
        columns={columns}
        data={activity}
        isLoading={query.isLoading}
        filters={
          <div className={UI_CENTER_ROW_RELAXED_CLASSNAME}>
            <div className='max-w-sm flex-1'>
              <SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onClear={() => setSearch('')}
                placeholder='Search login activity...'
                size='sm'
              />
            </div>
            <StatusBadge
              status={`${total} login${total === 1 ? '' : 's'}`}
              variant='info'
              className='py-1'
            />
          </div>
        }
        footer={
          <Pagination
            page={page}
            totalCount={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            showInfo={true}
            variant='compact'
            isLoading={query.isFetching}
          />
        }
        emptyState={
          <EmptyState
            title={deferredSearch ? 'No matching logins found' : 'No login activity yet'}
            description={
              deferredSearch
                ? 'Try a different email address, user identifier, or keyword.'
                : 'Successful sign-ins will appear here once users start logging in.'
            }
          />
        }
      />
    </PageLayout>
  );
}
