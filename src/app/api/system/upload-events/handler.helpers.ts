import type {
  FileUploadEventStatus,
  FileUploadEventsQueryInput as UploadEventsQueryInput,
} from '@/shared/contracts/files';
import { normalizeOptionalQueryString } from '@/shared/lib/api/query-schema';

export type UploadEventStatus = FileUploadEventStatus;

export const normalizeUploadEventStatusParam = (value: unknown): UploadEventStatus | undefined => {
  const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
  return normalized === 'success' || normalized === 'error' ? normalized : undefined;
};

export const parseUploadEventDateParam = (
  value: string | Date | null | undefined,
  endOfDay: boolean = false
): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const suffix = endOfDay ? 'T23:59:59.999' : 'T00:00:00.000';
  const date = new Date(`${value}${suffix}`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export const buildFileUploadEventsListInput = (query: UploadEventsQueryInput) => ({
  page: query.page,
  pageSize: query.pageSize,
  status: query.status,
  category: query.category,
  projectId: query.projectId,
  query: query.query,
  from: parseUploadEventDateParam(query.from),
  to: parseUploadEventDateParam(query.to, true),
});
