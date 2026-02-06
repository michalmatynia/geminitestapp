'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export type FileUploadEventRecord = {
  id: string;
  status: 'success' | 'error';
  category: string | null;
  projectId: string | null;
  folder: string | null;
  filename: string | null;
  filepath: string | null;
  mimetype: string | null;
  size: number | null;
  source: string | null;
  errorMessage: string | null;
  requestId: string | null;
  userId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string | Date;
};

export type FileUploadEventsResponse = {
  events?: FileUploadEventRecord[];
  total?: number;
  page?: number;
  pageSize?: number;
};

export type FileUploadEventsFilters = {
  page?: number;
  pageSize?: number;
  status?: 'success' | 'error' | 'all';
  category?: string;
  projectId?: string;
  query?: string;
  from?: string | null;
  to?: string | null;
};

const buildQueryParams = (filters: FileUploadEventsFilters): string => {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.category) params.set('category', filters.category);
  if (filters.projectId) params.set('projectId', filters.projectId);
  if (filters.query) params.set('query', filters.query);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  return params.toString();
};

export function useFileUploadEvents(
  filters: FileUploadEventsFilters,
): UseQueryResult<FileUploadEventsResponse, Error> {
  const queryKey = ['system', 'upload-events', filters];
  return useQuery({
    queryKey,
    queryFn: async (): Promise<FileUploadEventsResponse> => {
      const query = buildQueryParams(filters);
      const res = await fetch(`/api/system/upload-events?${query}`);
      if (!res.ok) throw new Error('Failed to load upload events.');
      return res.json() as Promise<FileUploadEventsResponse>;
    },
  });
}
