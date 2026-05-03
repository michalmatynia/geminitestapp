import type { FileUploadEventsFilters } from '@/shared/contracts/files';

type FileUploadEventsQueryParamValue = string | number | Date | null | undefined;

type FileUploadEventsQueryParamBuilder = {
  key: string;
  read: (filters: FileUploadEventsFilters) => FileUploadEventsQueryParamValue;
  shouldInclude?: (value: FileUploadEventsQueryParamValue) => boolean;
};

const hasNonEmptyQueryParamValue = (value: FileUploadEventsQueryParamValue): boolean => {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  return typeof value === 'number'
    ? Boolean(value)
    : typeof value === 'string'
      ? value.length > 0
      : false;
};

const isNonDefaultStatusQueryParamValue = (value: FileUploadEventsQueryParamValue): boolean =>
  typeof value === 'string' && value.length > 0 && value !== 'all';

const FILE_UPLOAD_EVENTS_QUERY_PARAM_BUILDERS: readonly FileUploadEventsQueryParamBuilder[] = [
  { key: 'page', read: (filters) => filters.page },
  { key: 'pageSize', read: (filters) => filters.pageSize },
  {
    key: 'status',
    read: (filters) => filters.status,
    shouldInclude: isNonDefaultStatusQueryParamValue,
  },
  { key: 'category', read: (filters) => filters.category },
  { key: 'projectId', read: (filters) => filters.projectId },
  { key: 'query', read: (filters) => filters.query },
  { key: 'from', read: (filters) => filters.from },
  { key: 'to', read: (filters) => filters.to },
];

export const buildQueryParams = (filters: FileUploadEventsFilters): string => {
  const params = new URLSearchParams();

  FILE_UPLOAD_EVENTS_QUERY_PARAM_BUILDERS.forEach(
    ({ key, read, shouldInclude = hasNonEmptyQueryParamValue }): void => {
      const value = read(filters);
      if (!shouldInclude(value)) return;
      const stringValue = value instanceof Date ? value.toISOString() : String(value);
      params.set(key, stringValue);
    }
  );

  return params.toString();
};
