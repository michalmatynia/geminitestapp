'use client';

import type {
  FileUploadEventRecord,
  FileUploadEventsResponse,
  FileUploadEventsFilters,
} from '@/shared/contracts/files';
import type { SingleQuery } from '@/shared/contracts/ui';
import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export type { FileUploadEventRecord, FileUploadEventsResponse, FileUploadEventsFilters };

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
  filters: FileUploadEventsFilters
): SingleQuery<FileUploadEventsResponse> {
  const queryKey = QUERY_KEYS.system.uploadEvents.list(filters);
  return createSingleQueryV2<FileUploadEventsResponse>({
    queryKey,
    queryFn: async (): Promise<FileUploadEventsResponse> => {
      const query = buildQueryParams(filters);
      const res = await fetch(`/api/system/upload-events?${query}`);
      if (!res.ok) throw new Error('Failed to load upload events.');
      return res.json() as Promise<FileUploadEventsResponse>;
    },
    id: JSON.stringify(filters),
    meta: {
      source: 'files.hooks.useFileUploadEvents',
      operation: 'detail',
      resource: 'system.upload-events',
      domain: 'global',
      queryKey,
      tags: ['files', 'upload-events'],
    },
  });
}
