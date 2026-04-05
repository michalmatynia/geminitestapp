import type {
  FileUploadEventRecord,
  FileUploadEventsResponse,
  FileUploadEventsFilters,
} from '@/shared/contracts/files';
import type { SingleQuery } from '@/shared/contracts/ui/ui/queries';
import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { buildQueryParams } from './useFileUploadEvents.helpers';

export type { FileUploadEventRecord, FileUploadEventsResponse, FileUploadEventsFilters };

export function useFileUploadEvents(
  filters: FileUploadEventsFilters
): SingleQuery<FileUploadEventsResponse> {
  const queryKey = QUERY_KEYS.system.uploadEvents.list(filters);
  return createSingleQueryV2<FileUploadEventsResponse>({
    queryKey,
    queryFn: async ({ signal }): Promise<FileUploadEventsResponse> => {
      const query = buildQueryParams(filters);
      const res = await fetch(`/api/system/upload-events?${query}`, signal ? { signal } : undefined);
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
      description: 'Loads system upload events.'},
  });
}
