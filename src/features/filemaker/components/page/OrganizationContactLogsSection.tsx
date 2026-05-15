'use client';

import {
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { Badge, Button, Card } from '@/shared/ui/primitives.public';

import { useAdminFilemakerOrganizationEditPageStateContext } from '../../context/AdminFilemakerOrganizationEditPageContext';
import type {
  MongoFilemakerContactLog,
  MongoFilemakerContactLogsResponse,
  MongoFilemakerContactLogValue,
} from '../../filemaker-contact-logs.types';
import { formatTimestamp } from '../../pages/filemaker-page-utils';
import { ContactLogControls } from './OrganizationContactLogsSection.controls';

const CONTACT_LOG_PAGE_SIZE = 25;
const ORGANIZATION_CONTACT_LOGS_QUERY_KEY = ['filemaker', 'organization-contact-logs'] as const;

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

type ContactLogController = {
  error: string | null;
  isLoading: boolean;
  loadRequestedPage: (page: number) => void;
  response: MongoFilemakerContactLogsResponse;
};

const buildContactLogsUrl = (input: {
  organizationId: string;
  page: number;
  query: string;
}): string => {
  const params = new URLSearchParams({
    page: String(input.page),
    pageSize: String(CONTACT_LOG_PAGE_SIZE),
  });
  const query = input.query.trim();
  if (query.length > 0) params.set('query', query);
  return `/api/filemaker/organizations/${encodeURIComponent(input.organizationId)}/contact-logs?${params.toString()}`;
};

function useContactLogController(
  organizationId: string | null,
  query: string
): ContactLogController {
  const [page, setPage] = useState(1);
  const normalizedOrganizationId = organizationId ?? '';
  const queryKey = [
    ...ORGANIZATION_CONTACT_LOGS_QUERY_KEY,
    { organizationId: normalizedOrganizationId, page, query },
  ] as const;
  const contactLogsQuery = createSingleQueryV2<
    MongoFilemakerContactLogsResponse,
    MongoFilemakerContactLogsResponse,
    typeof queryKey
  >({
    queryKey,
    queryFn: async ({ signal }) =>
      fetchJson<MongoFilemakerContactLogsResponse>(
        buildContactLogsUrl({ organizationId: normalizedOrganizationId, page, query }),
        signal
      ),
    enabled: organizationId !== null,
    placeholderData: (previousData) => previousData ?? emptyResponse(),
    meta: {
      source:
        'features.filemaker.components.page.OrganizationContactLogsSection.useContactLogController',
      operation: 'list',
      resource: 'filemaker.organization-contact-logs',
      domain: 'files',
      description: 'Load Filemaker contact logs linked to the current organization.',
      errorPresentation: 'inline',
    },
    telemetryContext: {
      hasOrganizationId: organizationId !== null,
      page,
      queryLength: query.length,
    },
  });

  useEffect(() => {
    setPage(1);
  }, [organizationId, query]);

  const loadRequestedPage = useCallback(
    (requestedPage: number): void => {
      if (requestedPage === contactLogsQuery.data?.page) {
        void contactLogsQuery.refetch();
        return;
      }
      setPage(requestedPage);
    },
    [contactLogsQuery]
  );

  return {
    error: contactLogsQuery.error === null ? null : contactLogsQuery.error.message,
    isLoading: contactLogsQuery.isFetching,
    loadRequestedPage,
    response: contactLogsQuery.data ?? emptyResponse(),
  };
}

export function OrganizationContactLogsSection(): React.JSX.Element | null {
  const { organization, relationshipSummary } =
    useAdminFilemakerOrganizationEditPageStateContext();
  const [queryDraft, setQueryDraft] = useState('');
  const [query, setQuery] = useState('');
  const { error, isLoading, loadRequestedPage, response } = useContactLogController(
    organization?.id ?? null,
    query
  );

  if (organization === null) return null;

  const snapshotCount = relationshipSummary?.counts.contactLogs ?? response.totalCount;

  return (
    <FormSection title='Contact Logs' className='space-y-4 p-4'>
      <ContactLogControls
        isLoading={isLoading}
        loadedCount={response.totalCount}
        onQueryDraftChange={setQueryDraft}
        onRefresh={(): void => {
          loadRequestedPage(response.page);
        }}
        onSearch={(): void => {
          setQuery(queryDraft.trim());
        }}
        queryDraft={queryDraft}
        snapshotCount={snapshotCount}
      />
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
        onPageChange={loadRequestedPage}
      />
    </FormSection>
  );
}
