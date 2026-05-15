'use client';

import { ExternalLink, MailOpen, RefreshCw } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import React, { startTransition } from 'react';

import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { Badge, Button } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

import { buildFilemakerMailThreadHref } from '../FilemakerMailSidebar.helpers';
import { useAdminFilemakerOrganizationEditPageStateContext } from '../../context/AdminFilemakerOrganizationEditPageContext';
import type { FilemakerMailSearchResponse, FilemakerMailSearchResultGroup } from '../../types';

const ORGANIZATION_EMAIL_LOG_QUERY_KEY = ['filemaker', 'organization-email-log'] as const;

const fetchJson = async <T,>(url: string, signal: AbortSignal): Promise<T> => {
  const response = await fetch(url, { headers: { 'content-type': 'application/json' }, signal });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return (await response.json()) as T;
};

const formatLogDate = (value: string | null | undefined): string => {
  if (value === null || value === undefined || value.trim().length === 0) return 'Unknown date';
  return new Date(value).toLocaleString();
};

const getSenderLabel = (group: FilemakerMailSearchResultGroup): string => {
  const firstHit = group.hits[0];
  if (firstHit === undefined) return 'Unknown sender';
  return firstHit.from?.name ?? firstHit.from?.address ?? 'Unknown sender';
};

const getGroupSnippet = (group: FilemakerMailSearchResultGroup): string | null => {
  const snippet = group.hits.at(0)?.matchSnippet.trim() ?? '';
  return snippet.length > 0 ? snippet : null;
};

function EmailLogOpenButton(props: {
  group: FilemakerMailSearchResultGroup;
}): React.JSX.Element {
  const router = useRouter();

  return (
    <Button
      type='button'
      size='sm'
      variant='outline'
      onClick={() => {
        const href = buildFilemakerMailThreadHref({
          threadId: props.group.threadId,
          accountId: props.group.accountId,
          mailboxPath: props.group.mailboxPath,
          originPanel: 'search',
        });
        startTransition(() => {
          router.push(href);
        });
      }}
    >
      <ExternalLink className='mr-1.5 size-3.5' />
      Open
    </Button>
  );
}

function OrganizationEmailLogGroup(props: {
  group: FilemakerMailSearchResultGroup;
}): React.JSX.Element {
  const { group } = props;
  const snippet = getGroupSnippet(group);

  return (
    <div className='rounded-md border border-border/60 bg-card/25 p-3'>
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <div className='min-w-0 flex-1'>
          <div className='truncate text-sm font-semibold text-white'>{group.threadSubject}</div>
          <div className='text-[11px] text-gray-500'>
            {group.mailboxPath} · {formatLogDate(group.lastMessageAt)}
          </div>
          <div className='mt-1 truncate text-xs text-gray-400'>{getSenderLabel(group)}</div>
        </div>
        <div className='flex items-center gap-2'>
          <Badge variant='outline' className='text-[10px]'>
            {group.hits.length} email{group.hits.length === 1 ? '' : 's'}
          </Badge>
          <EmailLogOpenButton group={group} />
        </div>
      </div>
      {snippet === null ? null : <div className='mt-2 text-xs text-gray-400'>{snippet}</div>}
    </div>
  );
}

function EmailLogContent(props: {
  error: string | null;
  isLoading: boolean;
  result: FilemakerMailSearchResponse | null;
}): React.JSX.Element {
  if (props.isLoading) {
    return <div className='text-sm text-gray-500'>Loading email log...</div>;
  }
  if (props.error !== null) {
    return (
      <div className='rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200'>
        {props.error}
      </div>
    );
  }
  if (props.result !== null && props.result.groups.length > 0) {
    return (
      <div className='space-y-3'>
        {props.result.groups.map((group: FilemakerMailSearchResultGroup) => (
          <OrganizationEmailLogGroup key={group.threadId} group={group} />
        ))}
      </div>
    );
  }
  return (
    <div className='rounded-md border border-border/60 bg-card/25 p-3 text-sm text-gray-500'>
      <MailOpen className='mr-2 inline-block size-4' />
      No received emails found.
    </div>
  );
}

export function OrganizationEmailLogSection(): React.JSX.Element {
  const { organization, emails } = useAdminFilemakerOrganizationEditPageStateContext();
  const organizationId = organization?.id ?? '';
  const emailLogQueryKey = [...ORGANIZATION_EMAIL_LOG_QUERY_KEY, organizationId] as const;
  const emailLogQuery = createSingleQueryV2<
    FilemakerMailSearchResponse,
    FilemakerMailSearchResponse,
    typeof emailLogQueryKey
  >({
    queryKey: emailLogQueryKey,
    queryFn: async ({ signal }) =>
      fetchJson<FilemakerMailSearchResponse>(
        `/api/filemaker/mail/organizations/${encodeURIComponent(organizationId)}/email-log`,
        signal
      ),
    enabled: organization !== null,
    meta: {
      source:
        'features.filemaker.components.page.OrganizationEmailLogSection.OrganizationEmailLogSection',
      operation: 'list',
      resource: 'filemaker.organization-email-log',
      domain: 'files',
      description: 'Load received email log entries linked to the current organization.',
      errorPresentation: 'inline',
    },
    telemetryContext: {
      hasOrganizationId: organization !== null,
    },
  });
  const result = emailLogQuery.data ?? null;
  const error = emailLogQuery.error === null ? null : emailLogQuery.error.message;

  return (
    <FormSection title='EMAIL LOG' className='space-y-4 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='outline' className='text-[10px]'>
            Linked Emails: {emails.length}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Received: {result?.totalHits ?? 0}
          </Badge>
        </div>
        <Button
          type='button'
          size='sm'
          variant='outline'
          onClick={() => {
            void emailLogQuery.refetch();
          }}
        >
          <RefreshCw className='mr-1.5 size-3.5' />
          Refresh
        </Button>
      </div>
      <EmailLogContent error={error} isLoading={emailLogQuery.isFetching} result={result} />
    </FormSection>
  );
}
