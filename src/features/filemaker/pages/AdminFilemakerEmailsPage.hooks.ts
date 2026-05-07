'use client';

import { useEffect, useState } from 'react';

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

const buildEmailListParams = (input: {
  page: number;
  pageSize: number;
  query: string;
  sort: EmailSortOption;
}): URLSearchParams => {
  const params = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
    sort: input.sort,
  });
  if (input.query.length > 0) params.set('query', input.query);
  return params;
};

export function useMongoFilemakerEmails(input: {
  page: number;
  pageSize: number;
  query: string;
  sort: EmailSortOption;
}): MongoFilemakerEmailsState {
  const { page, pageSize, query, sort } = input;
  const [state, setState] = useState<MongoFilemakerEmailsState>({
    ...EMPTY_EMAILS_RESPONSE,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    const params = buildEmailListParams({ page, pageSize, query, sort });
    setState((current) => ({ ...current, error: null, isLoading: true }));
    fetch(`/api/filemaker/emails?${params.toString()}`, { signal: controller.signal })
      .then(async (response: Response): Promise<MongoFilemakerEmailsResponse> => {
        if (!response.ok) throw new Error(`Failed to load emails (${response.status}).`);
        return (await response.json()) as MongoFilemakerEmailsResponse;
      })
      .then((response: MongoFilemakerEmailsResponse): void => {
        setState({ ...response, error: null, isLoading: false });
      })
      .catch((error: unknown): void => {
        if (controller.signal.aborted) return;
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : 'Failed to load emails.',
          isLoading: false,
        }));
      });
    return () => {
      controller.abort();
    };
  }, [page, pageSize, query, sort]);

  return state;
}
