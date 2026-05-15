'use client';

import { useEffect, useState } from 'react';

import { useSingleQueryV2 } from '@/shared/lib/query-factories-v2';

import type { FilemakerEmail, FilemakerEmailStatus } from '../types';

export type EmailLinkCounts = {
  total: number;
  persons: number;
  organizations: number;
};

export type EmailStatusFilter = FilemakerEmailStatus | 'all';
export type EmailSortOption =
  | 'email_asc'
  | 'email_desc'
  | 'createdAt_desc'
  | 'createdAt_asc'
  | 'updatedAt_desc'
  | 'updatedAt_asc'
  | 'status_asc'
  | 'status_desc';

export type MongoFilemakerEmailsResponse = {
  collectionCount: number;
  emails: FilemakerEmail[];
  filters: {
    status: EmailStatusFilter;
    updatedBy: string;
  };
  limit: number;
  linkCount: number;
  linkCountsByEmailId: Record<string, EmailLinkCounts>;
  page: number;
  pageSize: number;
  query: string;
  sort: EmailSortOption;
  totalCount: number;
  totalCountIsExact: boolean;
  totalPages: number;
};

export type MongoFilemakerEmailsState = MongoFilemakerEmailsResponse & {
  error: string | null;
  isLoading: boolean;
};

export const DEFAULT_EMAIL_PAGE_SIZE = 100;
export const EMAIL_PAGE_SIZE_OPTIONS = [50, 100, 200, 500];
export const DEFAULT_EMAIL_SORT: EmailSortOption = 'email_asc';

type EmailListInput = {
  page: number;
  pageSize: number;
  query: string;
  sort: EmailSortOption;
};

const FILEMAKER_EMAILS_QUERY_KEY = ['filemaker', 'emails'] as const;

const EMPTY_EMAILS_RESPONSE: MongoFilemakerEmailsResponse = {
  collectionCount: 0,
  emails: [],
  filters: {
    status: 'all',
    updatedBy: '',
  },
  limit: DEFAULT_EMAIL_PAGE_SIZE,
  linkCount: 0,
  linkCountsByEmailId: {},
  page: 1,
  pageSize: DEFAULT_EMAIL_PAGE_SIZE,
  query: '',
  sort: DEFAULT_EMAIL_SORT,
  totalCount: 0,
  totalCountIsExact: true,
  totalPages: 1,
};

export function useDebouncedValue(value: string, delayMs: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, value]);

  return debouncedValue;
}

const buildEmailListParams = (input: EmailListInput): URLSearchParams => {
  const params = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
    sort: input.sort,
  });
  if (input.query.length > 0) params.set('query', input.query);
  return params;
};

const buildEmailListQueryKey = (input: EmailListInput) =>
  [...FILEMAKER_EMAILS_QUERY_KEY, input] as const;

const fetchMongoFilemakerEmails = async (
  input: EmailListInput,
  signal: AbortSignal
): Promise<MongoFilemakerEmailsResponse> => {
  const params = buildEmailListParams(input);
  const response = await fetch(`/api/filemaker/emails?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`Failed to load emails (${response.status}).`);
  return (await response.json()) as MongoFilemakerEmailsResponse;
};

export function useMongoFilemakerEmails(input: EmailListInput): MongoFilemakerEmailsState {
  const queryKey = buildEmailListQueryKey(input);
  const emailsQuery = useSingleQueryV2<
    MongoFilemakerEmailsResponse,
    MongoFilemakerEmailsResponse,
    typeof queryKey
  >({
    queryKey,
    queryFn: async ({ signal }) => fetchMongoFilemakerEmails(input, signal),
    placeholderData: (previousData) => previousData ?? EMPTY_EMAILS_RESPONSE,
    meta: {
      source: 'features.filemaker.pages.AdminFilemakerEmailsPage.useMongoFilemakerEmails',
      operation: 'list',
      resource: 'filemaker.emails',
      domain: 'files',
      description: 'Load imported Filemaker emails for the admin emails table.',
      errorPresentation: 'inline',
    },
    telemetryContext: {
      page: input.page,
      pageSize: input.pageSize,
      queryLength: input.query.length,
      sort: input.sort,
    },
  });

  return {
    ...(emailsQuery.data ?? EMPTY_EMAILS_RESPONSE),
    error: emailsQuery.error === null ? null : emailsQuery.error.message,
    isLoading: emailsQuery.isFetching,
  };
}
