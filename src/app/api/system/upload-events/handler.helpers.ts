import type { FileUploadEventStatus } from '@/shared/contracts/files';
import { normalizeOptionalQueryString } from '@/shared/lib/api/query-schema';

export type UploadEventStatus = FileUploadEventStatus;

export type UploadEventsQueryInput = {
  page: number;
  pageSize: number;
  status?: UploadEventStatus;
  category?: string | undefined;
  projectId?: string | undefined;
  query?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
};

export const normalizeUploadEventStatusParam = (value: unknown): UploadEventStatus | undefined => {
  const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
  return normalized === 'success' || normalized === 'error' ? normalized : undefined;
};

export const parseUploadEventDateParam = (
  value: string | null | undefined,
  endOfDay: boolean = false
): Date | null => {
  if (!value) return null;
  const suffix = endOfDay ? 'T23:59:59.999' : 'T00:00:00.000';
  const date = new Date(`${value}${suffix}`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export const buildFileUploadEventsListInput = (query: UploadEventsQueryInput) => ({
  page: query.page,
  pageSize: query.pageSize,
  status: query.status ?? null,
  category: query.category ?? null,
  projectId: query.projectId ?? null,
  query: query.query ?? null,
  from: parseUploadEventDateParam(query.from),
  to: parseUploadEventDateParam(query.to, true),
});
