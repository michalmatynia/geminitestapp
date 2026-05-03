/* eslint-disable max-lines-per-function */
'use client';

import {
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  RefreshCw,
  Search,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { Badge, Button, Card, Input } from '@/shared/ui/primitives.public';

import { useAdminFilemakerOrganizationEditPageStateContext } from '../../context/AdminFilemakerOrganizationEditPageContext';
import type {
  MongoFilemakerContactLog,
  MongoFilemakerContactLogsResponse,
  MongoFilemakerContactLogValue,
} from '../../filemaker-contact-logs.types';
import { formatTimestamp } from '../../pages/filemaker-page-utils';

const CONTACT_LOG_PAGE_SIZE = 25;

const emptyResponse = (): MongoFilemakerContactLogsResponse => ({
  contactLogs: [],
  limit: CONTACT_LOG_PAGE_SIZE,
  page: 1,
  pageSize: CONTACT_LOG_PAGE_SIZE,
  query: '',
  totalCount: 0,
  totalPages: 1,
});

const fetchJson = async <T,>(url: string, signal: AbortSignal): Promise<T> => {
  const response = await fetch(url, { headers: { 'content-type': 'application/json' }, signal });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return (await response.json()) as T;
};

const formatOptionalValue = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : 'n/a';
};

const compactLabels = (values: MongoFilemakerContactLogValue[]): string[] =>
  values
    .map((value: MongoFilemakerContactLogValue): string =>
      formatOptionalValue(value.label ?? value.valueId ?? value.legacyValueUuid)
    )
    .filter((value: string): boolean => value !== 'n/a');

function ContactLogCard(props: {
  contactLog: MongoFilemakerContactLog;
}): React.JSX.Element {
  const { contactLog } = props;
  const labels = compactLabels(contactLog.values);
  const title = contactLog.contactTypeLabel ?? contactLog.mailCampaignLabel ?? 'Contact Log';
  const comment = contactLog.comment?.trim() ?? '';

  return (
    <Card variant='subtle-compact' className='bg-card/20'>
      <div className='flex items-start gap-3 p-3'>
        <MessageSquareText className='mt-0.5 size-3.5 shrink-0 text-amber-300' />
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='min-w-0 flex-1 truncate text-sm font-semibold text-white'>
              {title}
            </div>
            <Badge variant='outline' className='h-5 text-[10px]'>
              {formatTimestamp(contactLog.dateEntered ?? contactLog.createdAt)}
            </Badge>
          </div>
          {comment.length > 0 ? (
            <div className='mt-1 line-clamp-2 text-xs text-gray-300'>{comment}</div>
          ) : null}
          {labels.length > 0 ? (
            <div className='mt-2 flex flex-wrap gap-1.5'>
              {labels.slice(0, 4).map((label: string) => (
                <Badge key={label} variant='outline' className='text-[10px]'>
                  {label}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className='mt-2 truncate text-[10px] text-gray-600'>
            Legacy UUID: {contactLog.legacyUuid} | Parent:{' '}
            {formatOptionalValue(contactLog.legacyParentUuid)} | Modified:{' '}
            {formatTimestamp(contactLog.updatedAt)}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ContactLogPager(props: {
  isLoading: boolean;
  onPageChange: (page: number) => void;
  page: number;
  totalPages: number;
}): React.JSX.Element {
  return (
    <div className='flex items-center gap-2'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        disabled={props.isLoading || props.page <= 1}
        onClick={(): void => {
          props.onPageChange(props.page - 1);
        }}
      >
        <ChevronLeft className='mr-1 size-3.5' />
        Prev
      </Button>
      <Badge variant='outline' className='h-8 text-[10px]'>
        {props.page.toLocaleString()} / {props.totalPages.toLocaleString()}
      </Badge>
      <Button
        type='button'
        variant='outline'
        size='sm'
        disabled={props.isLoading || props.page >= props.totalPages}
        onClick={(): void => {
          props.onPageChange(props.page + 1);
        }}
      >
        Next
        <ChevronRight className='ml-1 size-3.5' />
      </Button>
    </div>
  );
}

function ContactLogContent(props: {
  contactLogs: MongoFilemakerContactLog[];
  isLoading: boolean;
}): React.JSX.Element {
  if (props.isLoading && props.contactLogs.length === 0) {
    return <div className='text-sm text-gray-500'>Loading contact logs...</div>;
  }
  if (props.contactLogs.length === 0) {
    return <div className='text-sm text-gray-500'>No contact logs found.</div>;
  }
  return (
    <div className='grid gap-2'>
      {props.contactLogs.map((contactLog: MongoFilemakerContactLog) => (
        <ContactLogCard key={contactLog.id} contactLog={contactLog} />
      ))}
    </div>
  );
}

export function OrganizationContactLogsSection(): React.JSX.Element | null {
  const { organization, relationshipSummary } =
    useAdminFilemakerOrganizationEditPageStateContext();
  const [response, setResponse] = useState<MongoFilemakerContactLogsResponse>(emptyResponse);
  const [queryDraft, setQueryDraft] = useState('');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (page: number, signal: AbortSignal): Promise<void> => {
      if (organization === null) return;
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(CONTACT_LOG_PAGE_SIZE),
        });
        if (query.trim().length > 0) params.set('query', query.trim());
        const result = await fetchJson<MongoFilemakerContactLogsResponse>(
          `/api/filemaker/organizations/${encodeURIComponent(organization.id)}/contact-logs?${params.toString()}`,
          signal
        );
        setResponse(result);
      } catch (loadError: unknown) {
        if (signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load contact logs.');
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    },
    [organization, query]
  );

  useEffect(() => {
    if (organization === null) return undefined;
    const controller = new AbortController();
    void loadPage(1, controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadPage, organization]);

  if (organization === null) return null;

  const snapshotCount = relationshipSummary?.counts.contactLogs ?? response.totalCount;

  return (
    <FormSection title='Contact Logs' className='space-y-4 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='outline' className='text-[10px]'>
            Snapshot: {snapshotCount.toLocaleString()}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Loaded: {response.totalCount.toLocaleString()}
          </Badge>
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={isLoading}
          onClick={(): void => {
            const controller = new AbortController();
            void loadPage(response.page, controller.signal);
          }}
        >
          <RefreshCw className='mr-1.5 size-3.5' />
          Refresh
        </Button>
      </div>
      <form
        className='flex flex-wrap gap-2'
        onSubmit={(event: React.FormEvent<HTMLFormElement>): void => {
          event.preventDefault();
          setQuery(queryDraft.trim());
        }}
      >
        <Input
          value={queryDraft}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            setQueryDraft(event.target.value);
          }}
          placeholder='Search contact logs'
          aria-label='Search contact logs'
          className='min-w-[220px] flex-1'
        />
        <Button type='submit' variant='outline' size='sm' disabled={isLoading}>
          <Search className='mr-1.5 size-3.5' />
          Search
        </Button>
      </form>
      {error !== null ? (
        <div className='rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200'>
          {error}
        </div>
      ) : null}
      <ContactLogContent contactLogs={response.contactLogs} isLoading={isLoading} />
      <ContactLogPager
        isLoading={isLoading}
        page={response.page}
        totalPages={response.totalPages}
        onPageChange={(page: number): void => {
          const controller = new AbortController();
          void loadPage(page, controller.signal);
        }}
      />
    </FormSection>
  );
}
